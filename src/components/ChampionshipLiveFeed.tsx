import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio } from "lucide-react";

type Row = {
  id: string; round_name: string; slot: number;
  participant_a_id: string | null; participant_b_id: string | null;
  score_a: number | null; score_b: number | null;
  winner_id: string | null; status: string | null; updated_at: string | null;
};
type Team = { id: string; name: string; logo_url: string | null };

const STAGE_LABEL: Record<string, string> = { R16: "Round of 16", QF: "Quarterfinal", SF: "Semifinal", F: "Final" };

/** Live commentary strip for a championship bracket — surfaces settled results
 * as they happen, football-flavoured or generic depending on `sport`. */
export function ChampionshipLiveFeed({ tournamentId, sport }: { tournamentId: string; sport: "football" | "generic" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("tournament_matches")
        .select("id,round_name,slot,participant_a_id,participant_b_id,score_a,score_b,winner_id,status,updated_at")
        .eq("tournament_id", tournamentId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (cancelled) return;
      const rs = (data ?? []) as Row[];
      setRows(rs);
      const ids = Array.from(new Set(rs.flatMap((r) => [r.participant_a_id, r.participant_b_id]).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: ts } = await (supabase as any).from("teams").select("id,name,logo_url").in("id", ids);
        if (!cancelled) setTeams(Object.fromEntries((ts ?? []).map((t: Team) => [t.id, t])));
      }
    };
    load();
    const ch = (supabase as any)
      .channel(`champ-feed:${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${tournamentId}` }, load)
      .subscribe();
    const iv = setInterval(load, 6000);
    return () => { cancelled = true; clearInterval(iv); try { (supabase as any).removeChannel(ch); } catch { /* noop */ } };
  }, [tournamentId]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-primary/20 bg-background/40 p-4 text-center text-xs text-muted-foreground">
        <Radio className="h-4 w-4 mx-auto mb-1 opacity-40" />
        Live feed will appear here once matches start settling.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-background/40 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-primary font-black">
        <Radio className="h-3 w-3 animate-pulse text-destructive" /> Live feed
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 text-xs">
        {rows.map((r) => {
          const a = r.participant_a_id ? teams[r.participant_a_id]?.name ?? "?" : "?";
          const b = r.participant_b_id ? teams[r.participant_b_id]?.name ?? "?" : "?";
          const winner = r.winner_id === r.participant_a_id ? a : b;
          const sa = r.score_a ?? 0, sb = r.score_b ?? 0;
          const stage = STAGE_LABEL[r.round_name] ?? r.round_name;
          const verb = sport === "football"
            ? (Math.abs(sa - sb) >= 3 ? "thrash" : Math.abs(sa - sb) === 1 ? "edge past" : "sink")
            : (Math.abs(sa - sb) >= 3 ? "dominate" : "outlast");
          return (
            <div key={r.id} className="flex items-baseline gap-2 border-b border-border/40 pb-1 last:border-0">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{stage}</span>
              <span className="font-bold">{winner}</span>
              <span className="text-muted-foreground">{verb}</span>
              <span className="font-bold">{r.winner_id === r.participant_a_id ? b : a}</span>
              <span className="ml-auto tabular-nums font-black text-amber-300">{sa}–{sb}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
