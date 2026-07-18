import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

type TeamWizardMatchFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function TeamWizardMatchForm({ open, onOpenChange, onSuccess }: TeamWizardMatchFormProps) {
  const [futureMatches, setFutureMatches] = useState<any[]>([]);
  const [roster, setRoster] = useState<Array<{ id: string; name: string; logo_url: string | null; kind: "player" | "team" }>>([]);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "ONE LEAGUE. NO MERCY. RESPECT THE GAME.",
    eventDate: "",
    futuresMatchId: "",
    teamA: "",
    teamB: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  async function loadData() {
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

  function resetForm() {
    setFormData({
      name: "",
      tagline: "ONE LEAGUE. NO MERCY. RESPECT THE GAME.",
      eventDate: "",
      futuresMatchId: "",
      teamA: "",
      teamB: "",
    });
  }

  async function createMatch() {
    setBusy(true);

    try {
      if (!formData.name.trim()) { toast.error("Match name required"); setBusy(false); return; }
      if (!formData.teamA) { toast.error("Select Team A"); setBusy(false); return; }
      if (!formData.teamB) { toast.error("Select Team B"); setBusy(false); return; }
      if (formData.teamA === formData.teamB) { toast.error("Teams must be different"); setBusy(false); return; }

      const teamA = roster.find((r) => r.id === formData.teamA);
      const teamB = roster.find((r) => r.id === formData.teamB);
      if (!teamA || !teamB) { toast.error("Teams not found"); setBusy(false); return; }

      // Create match
      const { data: match, error: matchErr } = await (supabase as any).from("matches").insert({
        name: formData.name.trim(),
        description: formData.tagline.trim() || null,
        match_kind: "wizard",
        home_team: teamA.name,
        away_team: teamB.name,
        home_logo: teamA.logo_url,
        away_logo: teamB.logo_url,
        start_time: formData.eventDate ? new Date(formData.eventDate).toISOString() : null,
        status: "scheduled",
        is_virtual: false,
        is_archived: false,
      }).select().single();

      if (matchErr) { toast.error(matchErr.message); setBusy(false); return; }

      // Link betting market if provided
      if (formData.futuresMatchId && match) {
        await (supabase as any).from("matches").update({ futures_match_id: formData.futuresMatchId }).eq("id", match.id);
      }

      toast.success("Team Wizard Match created!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Create Team Wizard Match
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match info */}
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold">Match Name</Label>
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
                <SelectTrigger><SelectValue placeholder="Pick first team" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Pick second team" /></SelectTrigger>
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
              <div className="text-xs font-bold text-primary">Match Summary</div>
              <div className="text-xs text-muted-foreground">
                <div><b>{formData.name}</b></div>
                <div>{roster.find((r) => r.id === formData.teamA)?.name} vs {roster.find((r) => r.id === formData.teamB)?.name}</div>
                {formData.eventDate && <div>{new Date(formData.eventDate).toLocaleDateString()}</div>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button 
            onClick={createMatch} 
            disabled={busy || !formData.name || !formData.teamA || !formData.teamB}
            className="btn-luxury"
          >
            {busy ? "Creating..." : "Create Match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
