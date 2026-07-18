import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type Tournament_Type = {
  id: string;
  name: string;
  tagline: string | null;
  event_date: string | null;
  status: string;
  is_featured: boolean;
  futures_match_id?: string | null;
};

type Participant = {
  id: string;
  name: string;
  logo_url: string | null;
};

function labelFor(matchesInRound: number, j: number) {
  if (matchesInRound === 1) return "FINAL";
  if (matchesInRound === 2) return `SF${j + 1}`;
  if (matchesInRound === 4) return `QF${j + 1}`;
  if (matchesInRound === 8) return `R16-${j + 1}`;
  return `M${j + 1}`;
}

function roundNameFor(playersInRound: number) {
  if (playersInRound <= 2) return "Grand Final";
  if (playersInRound <= 4) return "Semifinals";
  if (playersInRound <= 8) return "Quarterfinals";
  if (playersInRound <= 16) return "Round of 16";
  return `Round of ${playersInRound}`;
}

export function TeamWizardMatchSetup() {
  const confirm = useConfirm();
  const [tournaments, setTournaments] = useState<Tournament_Type[]>([]);
  const [futureMatches, setFutureMatches] = useState<any[]>([]);
  const [roster, setRoster] = useState<Array<{ id: string; name: string; logo_url: string | null; kind: "player" | "team" }>>([]);

  // Single form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tagline: "ONE LEAGUE. NO MERCY. RESPECT THE GAME.",
    eventDate: "",
    futuresMatchId: "",
    teamA: "",
    teamB: "",
  });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadData() {
    const { data } = await (supabase as any).from("tournaments").select("*").order("created_at", { ascending: false });
    setTournaments(data ?? []);

    const { data: fm } = await (supabase as any).from("matches").select("id,name").eq("match_kind", "future").eq("is_archived", false);
    setFutureMatches(fm ?? []);

    const [{ data: pls }, { data: tms }] = await Promise.all([
      supabase.from("players").select("id,name,avatar_url").order("name"),
      supabase.from("teams").select("id,name,logo_url").order("name"),
    ]);

    setRoster([
      ...((tms ?? []).map((t: any) => ({ id: `team:${t.id}`, name: t.name, logo_url: t.logo_url ?? null, kind: "team" as const }))),
      ...((pls ?? []).map((p: any) => ({ id: `player:${p.id}`, name: p.name, logo_url: p.avatar_url ?? null, kind: "player" as const }))),
    ]);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setFormData({
      name: "",
      tagline: "ONE LEAGUE. NO MERCY. RESPECT THE GAME.",
      eventDate: "",
      futuresMatchId: "",
      teamA: "",
      teamB: "",
    });
    setParticipants([]);
  }

  async function createTournament() {
    setBusy(true);

    try {
      // Validate
      if (!formData.name.trim()) { toast.error("Tournament name required"); setBusy(false); return; }
      if (!formData.teamA) { toast.error("Select Team A"); setBusy(false); return; }
      if (!formData.teamB) { toast.error("Select Team B"); setBusy(false); return; }
      if (formData.teamA === formData.teamB) { toast.error("Teams must be different"); setBusy(false); return; }

      // Get team names
      const teamA = roster.find((r) => r.id === formData.teamA);
      const teamB = roster.find((r) => r.id === formData.teamB);
      if (!teamA || !teamB) { toast.error("Teams not found"); setBusy(false); return; }

      // Create tournament
      const { data: t, error: tErr } = await (supabase as any).from("tournaments").insert({
        name: formData.name.trim(),
        tagline: formData.tagline.trim() || null,
        event_date: formData.eventDate || null,
        status: "active",
        is_featured: true,
        futures_match_id: formData.futuresMatchId || null,
      }).select().single();

      if (tErr) { toast.error(tErr.message); setBusy(false); return; }

      // Create participants
      const { error: pErr } = await (supabase as any).from("tournament_participants").insert([
        { tournament_id: t.id, name: teamA.name, logo_url: teamA.logo_url, seed: 1 },
        { tournament_id: t.id, name: teamB.name, logo_url: teamB.logo_url, seed: 2 },
      ]);

      if (pErr) { toast.error(pErr.message); setBusy(false); return; }

      // Auto-generate bracket for 2 teams (simple final)
      const { error: mErr } = await (supabase as any).from("tournament_matches").insert({
        tournament_id: t.id,
        round: 1,
        slot: 0,
        label: "FINAL",
        round_name: "Grand Final",
        next_match_id: null,
        next_slot: null,
        status: "pending",
        participant_a_id: t.id.substring(0, 10),
        participant_b_id: t.id.substring(10, 20),
      });

      if (mErr) toast.error("Note: Bracket creation partial - " + mErr.message);

      toast.success("Tournament created!");
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTournament(id: string) {
    const ok = await confirm({ title: "Delete tournament?", description: "All brackets, participants and results will be removed.", confirmText: "Delete" });
    if (!ok) return;
    
    await (supabase as any).from("tournament_matches").delete().eq("tournament_id", id);
    await (supabase as any).from("tournament_participants").delete().eq("tournament_id", id);
    const { error } = await (supabase as any).from("tournaments").delete().eq("id", id);
    
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    loadData();
  }

  return (
    <div className="space-y-4">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-black flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Team Wizard Tournaments
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="btn-luxury">
          <Plus className="h-4 w-4 mr-1" /> New Tournament
        </Button>
      </div>

      {/* Tournaments grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tournaments.length === 0 ? (
          <Card className="glass p-6 col-span-full text-center">
            <p className="text-sm text-muted-foreground">No tournaments yet. Click "New Tournament" to create one.</p>
          </Card>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id} className="glass p-4 hover:border-primary/50 transition space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.tagline || "—"}</div>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize shrink-0">{t.status}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t.event_date ? new Date(t.event_date).toLocaleDateString() : "No date"}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]">View</Button>
                <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => deleteTournament(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Single-form dialog (like Shooter Match) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Create Team Wizard Tournament
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tournament info */}
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold">Tournament Name</Label>
              <Input 
                placeholder="E.g., 'Elite Squad Showdown'" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold">Tagline</Label>
              <Input 
                placeholder="Short motto or slogan" 
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold">Event Date (optional)</Label>
              <Input 
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
            </div>

            {/* Teams selection */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-xs uppercase font-bold">Select Competing Teams</Label>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Team A</Label>
                <Select value={formData.teamA} onValueChange={(v) => setFormData({ ...formData, teamA: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick seeded team" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {roster.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No teams available</div>}
                    {roster.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="text-[10px] text-muted-foreground mr-1">{r.kind === "team" ? "GANG" : "SHOOTER"}</span>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Team B</Label>
                <Select value={formData.teamB} onValueChange={(v) => setFormData({ ...formData, teamB: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick seeded team" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {roster.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No teams available</div>}
                    {roster.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="text-[10px] text-muted-foreground mr-1">{r.kind === "team" ? "GANG" : "SHOOTER"}</span>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Betting market */}
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold">Betting Market (optional)</Label>
              <Select value={formData.futuresMatchId} onValueChange={(v) => setFormData({ ...formData, futuresMatchId: v })}>
                <SelectTrigger><SelectValue placeholder="Link betting market" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">— None —</SelectItem>
                  {futureMatches.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {formData.name && formData.teamA && formData.teamB && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="text-xs font-bold text-primary">Tournament Summary</div>
                <div className="text-xs text-muted-foreground">
                  <div><b>{formData.name}</b></div>
                  <div>{roster.find((r) => r.id === formData.teamA)?.name} vs {roster.find((r) => r.id === formData.teamB)?.name}</div>
                  {formData.eventDate && <div>{new Date(formData.eventDate).toLocaleDateString()}</div>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={busy}>Cancel</Button>
            <Button 
              onClick={createTournament} 
              disabled={busy || !formData.name || !formData.teamA || !formData.teamB}
              className="btn-luxury"
            >
              {busy ? "Creating..." : "Create Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
