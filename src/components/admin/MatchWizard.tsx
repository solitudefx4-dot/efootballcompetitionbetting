import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { X, Trophy, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConfirm } from '@/hooks/use-confirm';

const POPULAR_SCORES = [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [0, 1], [0, 2], [1, 2], [0, 3]];
const DEFAULT_ODDS_BY_SCORE: Record<string, number> = { "0-0": 10, "1-0": 8, "1-1": 8, "2-0": 10, "2-1": 10, "2-2": 12, "3-0": 15, "3-1": 15, "0-1": 8, "0-2": 10, "1-2": 10, "0-3": 15 };

async function fetchTeams() {
  const { data } = await supabase.from('teams').select('*').order('name');
  return data ?? [];
}

async function logAudit(action: string, resource: string, resource_id: string, details?: Record<string, any>) {
  await supabase.from('audit_logs').insert({ action, resource, resource_id, details });
}

function TeamStep({ label, team, setTeam, teams }: any) {
  return (
    <div className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/30">
      <div>
        <label className="text-xs text-muted-foreground">Use existing team or create new</label>
        <Select value={team.id} onValueChange={(v) => { const t = teams.find((x: any) => x.id === v); setTeam(t ? { id: t.id, name: t.name, logoFile: null, mainPlayers: "", subPlayers: "" } : { ...team, id: v }); }}>
          <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
          <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!team.id && (
        <>
          <div>
            <label className="text-xs text-muted-foreground">Team name</label>
            <Input value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} placeholder="e.g. Lions" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Logo (PNG/SVG)</label>
            <Input type="file" accept="image/*" onChange={(e) => setTeam({ ...team, logoFile: e.target.files?.[0] ?? null })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Main players (comma-separated)</label>
            <Input value={team.mainPlayers} onChange={(e) => setTeam({ ...team, mainPlayers: e.target.value })} placeholder="John, Sarah, Mike" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Substitute players (comma-separated)</label>
            <Input value={team.subPlayers} onChange={(e) => setTeam({ ...team, subPlayers: e.target.value })} placeholder="Alex, Jordan" />
          </div>
        </>
      )}
    </div>
  );
}

export function MatchWizard({ onClose }: { onClose: () => void }) {
  const confirm = useConfirm();
  const [teams, setTeams] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [teamA, setTeamA] = useState({ id: "", name: "", logoFile: null as File | null, mainPlayers: "", subPlayers: "" });
  const [teamB, setTeamB] = useState({ id: "", name: "", logoFile: null as File | null, mainPlayers: "", subPlayers: "" });
  const [details, setDetails] = useState({
    homeIs: "A" as "A" | "B",
    oddsA: 2.0, draw: 3.5, oddsB: 2.0,
    name: "", start_time: "", location: "", category_id: "",
    featured: false, featured_image_url: null as string | null,
    featured_image_fit: "cover", featured_image_position: "center",
    homePresent: false, awayPresent: false, restrictRepeat: false
  });
  const [csEnabled, setCsEnabled] = useState(true);
  const [csRows, setCsRows] = useState<Array<{ label: string; value: number }>>(POPULAR_SCORES.map(([h, a]) => ({ label: `${h}-${a}`, value: DEFAULT_ODDS_BY_SCORE[`${h}-${a}`] ?? 15 })));
  const [csCustomH, setCsCustomH] = useState(0);
  const [csCustomA, setCsCustomA] = useState(0);
  const [csCustomOdds, setCsCustomOdds] = useState(10);

  useEffect(() => {
    fetchTeams().then(setTeams);
    supabase.from('categories').select('*').then(({ data }) => setCats(data ?? []));
  }, []);

  async function uploadLogo(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `team-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('team-logos').upload(path, file);
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
  }

  async function ensureTeam(t: typeof teamA): Promise<string | null> {
    if (t.id) return t.id;
    if (!t.name.trim()) { toast.error('Team name required'); return null; }
    let logo_url: string | null = null;
    if (t.logoFile) logo_url = await uploadLogo(t.logoFile);
    const { data, error } = await supabase.from('teams').insert({ name: t.name.trim(), logo_url }).select().single();
    if (error) { toast.error(error.message); return null; }
    const players = [
      ...t.mainPlayers.split(",").map((n) => n.trim()).filter(Boolean).map((name) => ({ team_id: data.id, name, is_substitute: false })),
      ...t.subPlayers.split(",").map((n) => n.trim()).filter(Boolean).map((name) => ({ team_id: data.id, name, is_substitute: true })),
    ];
    if (players.length) await supabase.from('players').insert(players);
    return data.id;
  }

  async function finalCreate() {
    const aId = await ensureTeam(teamA); if (!aId) return;
    const bId = await ensureTeam(teamB); if (!bId) return;
    const home_team_id = details.homeIs === "A" ? aId : bId;
    const away_team_id = details.homeIs === "A" ? bId : aId;
    const homeName = (details.homeIs === "A" ? teamA.name : teamB.name) || teams.find((t) => t.id === home_team_id)?.name;
    const awayName = (details.homeIs === "A" ? teamB.name : teamA.name) || teams.find((t) => t.id === away_team_id)?.name;
    const homeOdds = details.homeIs === "A" ? details.oddsA : details.oddsB;
    const awayOdds = details.homeIs === "A" ? details.oddsB : details.oddsA;
    const startLabel = details.start_time ? new Date(details.start_time).toLocaleString() : "immediately";
    const ok = await confirm({
      title: "Post this match?",
      description: `${homeName} (${homeOdds}) vs ${awayName} (${awayOdds}) · Draw ${details.draw} · Start ${startLabel} · CS market: ${csEnabled ? `${csRows.length} scores` : "off"} · Featured: ${details.featured ? "Yes" : "No"}. Double-check before posting — users see this immediately.`,
      confirmText: "Post match", cancelText: "Review again",
    });
    if (!ok) return;
    const { data: m, error } = await supabase.from('matches').insert({
      name: details.name || `${homeName} vs ${awayName}`,
      home_team_id, away_team_id,
      start_time: details.start_time ? new Date(details.start_time).toISOString() : new Date().toISOString(),
      location: details.location, status: "scheduled",
      category_id: details.category_id || null, is_featured: details.featured,
      featured_image_url: details.featured ? details.featured_image_url : null,
      featured_image_fit: details.featured_image_fit, featured_image_position: details.featured_image_position,
      home_present: details.homePresent, away_present: details.awayPresent, restrict_repeat_contender: details.restrictRepeat,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    const { data: market } = await supabase.from('markets').insert({ match_id: m.id, name: "Match Winner" }).select().single();
    if (market) {
      await supabase.from('odds').insert([
        { market_id: market.id, label: homeName, value: homeOdds },
        { market_id: market.id, label: "Draw", value: details.draw },
        { market_id: market.id, label: awayName, value: awayOdds },
      ]);
    }
    if (csEnabled && csRows.length > 0) {
      const { data: csMarket } = await supabase.from('markets').insert({ match_id: m.id, name: "Correct Score", is_open: true }).select().single();
      if (csMarket) {
        await supabase.from('odds').insert(csRows.map((r) => ({ market_id: csMarket.id, label: r.label, value: r.value })));
      }
    }
    await supabase.from('notifications').insert({ user_id: null as any, title: "New match scheduled", body: `${homeName} vs ${awayName} — get your picks ready.`, link: `/matches/${m.id}` }).then(() => {});
    await logAudit('match_created', 'match', m.id);
    toast.success('Match created!');
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Match Wizard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Teams Section */}
          <Accordion type="single" collapsible defaultValue="teams" className="w-full">
            <AccordionItem value="teams">
              <AccordionTrigger className="text-sm font-bold">Teams</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <label className="text-xs font-semibold mb-2 block">Home Team</label>
                  <TeamStep label="Team A" team={teamA} setTeam={setTeamA} teams={teams} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block">Away Team</label>
                  <TeamStep label="Team B" team={teamB} setTeam={setTeamB} teams={teams} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Match Details Section */}
          <Accordion type="single" collapsible defaultValue="details" className="w-full">
            <AccordionItem value="details">
              <AccordionTrigger className="text-sm font-bold">Match Details & Odds</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Home / Away</label>
                    <Select value={details.homeIs} onValueChange={(v) => setDetails({ ...details, homeIs: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Team A is Home</SelectItem>
                        <SelectItem value="B">Team B is Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Category</label>
                    <Select value={details.category_id} onValueChange={(v) => setDetails({ ...details, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs">Team A win odds</label><Input type="number" step="0.01" value={details.oddsA} onChange={(e) => setDetails({ ...details, oddsA: Number(e.target.value) })} /></div>
                  <div><label className="text-xs">Draw odds</label><Input type="number" step="0.01" value={details.draw} onChange={(e) => setDetails({ ...details, draw: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><label className="text-xs">Team B win odds</label><Input type="number" step="0.01" value={details.oddsB} onChange={(e) => setDetails({ ...details, oddsB: Number(e.target.value) })} /></div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Correct Score Section */}
          <Accordion type="single" collapsible defaultValue="cs" className="w-full">
            <AccordionItem value="cs">
              <AccordionTrigger className="text-sm font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Correct Score Market</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <label className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card/60 p-3"><Switch checked={csEnabled} onCheckedChange={setCsEnabled} />Enable Correct Score Market</label>
                {csEnabled && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      {csRows.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0">{r.label}</Badge>
                          <Input type="number" step="0.01" value={r.value} onChange={(e) => setCsRows(csRows.map((x, j) => j === i ? { ...x, value: Number(e.target.value) } : x))} />
                          <button className="text-destructive shrink-0" onClick={() => setCsRows(csRows.filter((_, idx) => idx !== i))} title="Remove"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 bg-card/50 rounded border border-border/30">
                      <Input type="number" placeholder="Home score" min="0" max="10" value={csCustomH} onChange={(e) => setCsCustomH(Number(e.target.value))} className="w-20" />
                      <Input type="number" placeholder="Away score" min="0" max="10" value={csCustomA} onChange={(e) => setCsCustomA(Number(e.target.value))} className="w-20" />
                      <Input type="number" placeholder="Odds" step="0.01" value={csCustomOdds} onChange={(e) => setCsCustomOdds(Number(e.target.value))} />
                      <Button size="sm" onClick={() => { if (csCustomH || csCustomA) setCsRows([...csRows, { label: `${csCustomH}-${csCustomA}`, value: csCustomOdds }]); }}><Upload className="h-3 w-3 mr-1" />Add</Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Final Settings Section */}
          <Accordion type="single" collapsible defaultValue="final" className="w-full">
            <AccordionItem value="final">
              <AccordionTrigger className="text-sm font-bold">Final Settings</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Input placeholder="Match name (e.g. Round 14 · Night Hunt)" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                <div>
                  <label className="text-xs text-muted-foreground">Countdown / Start time</label>
                  <Input type="datetime-local" value={details.start_time} onChange={(e) => setDetails({ ...details, start_time: e.target.value })} />
                </div>
                <Input placeholder="Location / stream / venue" value={details.location} onChange={(e) => setDetails({ ...details, location: e.target.value })} />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card/60 p-3"><Switch checked={details.featured} onCheckedChange={(v) => setDetails({ ...details, featured: v })} />Feature on homepage</label>
                  <label className="flex items-center gap-2 rounded-lg border border-accent/20 bg-card/60 p-3"><Switch checked={details.homePresent} onCheckedChange={(v) => setDetails({ ...details, homePresent: v })} />Home present</label>
                  <label className="flex items-center gap-2 rounded-lg border border-accent/20 bg-card/60 p-3"><Switch checked={details.awayPresent} onCheckedChange={(v) => setDetails({ ...details, awayPresent: v })} />Away present</label>
                  <label className="flex items-center gap-2 rounded-lg border border-accent/20 bg-card/60 p-3"><Switch checked={details.restrictRepeat} onCheckedChange={(v) => setDetails({ ...details, restrictRepeat: v })} />Restrict repeat bets</label>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="btn-luxury" onClick={finalCreate}>Create Match</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
