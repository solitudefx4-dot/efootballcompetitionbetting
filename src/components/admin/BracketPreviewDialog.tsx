import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2 } from "lucide-react";
import { type TParticipant } from "@/components/TournamentBracket";

interface BracketPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: TParticipant[];
  bracketSlots: (string | null)[];
  slotAssignments: Map<number, string | null>;
  onAssignParticipant: (slotIndex: number, participantId: string | null) => void;
  onGenerate: () => void;
  partMap: Record<string, TParticipant>;
}

export function BracketPreviewDialog({
  open,
  onOpenChange,
  participants,
  bracketSlots,
  slotAssignments,
  onAssignParticipant,
  onGenerate,
  partMap,
}: BracketPreviewDialogProps) {
  const [viewMode, setViewMode] = useState<"slots" | "matchups">("matchups");

  // Generate opening round matchups from bracket slots
  const matchupPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < bracketSlots.length; i += 2) {
      const slotAId = slotAssignments.get(i);
      const slotBId = slotAssignments.get(i + 1);
      const slotA = slotAId ? partMap[slotAId] : null;
      const slotB = slotBId ? partMap[slotBId] : null;

      pairs.push({
        slotA: { id: i, participant: slotA },
        slotB: { id: i + 1, participant: slotB },
        matchNumber: pairs.length + 1,
      });
    }
    return pairs;
  }, [bracketSlots, slotAssignments, partMap]);

  // Calculate bracket size info
  const bracketSizeInfo = useMemo(() => {
    const size = bracketSlots.length;
    const rounds = Math.log2(size);
    return {
      size,
      rounds,
      totalMatches: size / 2,
    };
  }, [bracketSlots.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-primary/30 max-w-4xl backdrop-blur-2xl shadow-luxury overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-gold" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Bracket Preview & Customization
          </DialogTitle>
          <DialogDescription>
            Assign participants to bracket slots and preview matchups. Click any empty slot to change the assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Banner */}
          <div className="rounded-lg bg-amber-950/40 border border-amber-900/50 px-3 py-2">
            <p className="text-[11px] text-amber-200">
              <strong>Bracket Info:</strong> {participants.length} participants → {bracketSlots.length} bracket slots
              ({bracketSizeInfo.rounds} rounds, {bracketSlots.length / 2} opening matches)
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 border-b border-primary/20">
            <button
              onClick={() => setViewMode("matchups")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "matchups"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Matchup Preview
            </button>
            <button
              onClick={() => setViewMode("slots")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "slots"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Slot Assignment
            </button>
          </div>

          {/* Matchups View */}
          {viewMode === "matchups" && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {matchupPairs.map((matchup, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-primary/30 bg-card/50 p-3 space-y-2"
                >
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Opening Round Match {matchup.matchNumber}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Slot A */}
                    <div className="flex-1 space-y-1">
                      <Select
                        value={slotAssignments.get(matchup.slotA.id) ?? ""}
                        onValueChange={(val) =>
                          onAssignParticipant(matchup.slotA.id, val || null)
                        }
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue
                            placeholder={matchup.slotA.participant?.name ?? "— Empty —"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Empty (Bye) —</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {matchup.slotA.participant?.logo_url && (
                        <img
                          src={matchup.slotA.participant.logo_url}
                          alt=""
                          className="h-6 w-6 rounded object-cover border border-primary/30"
                        />
                      )}
                    </div>

                    {/* VS Badge */}
                    <div className="text-xs font-bold text-muted-foreground uppercase px-2">
                      vs
                    </div>

                    {/* Slot B */}
                    <div className="flex-1 space-y-1">
                      <Select
                        value={slotAssignments.get(matchup.slotB.id) ?? ""}
                        onValueChange={(val) =>
                          onAssignParticipant(matchup.slotB.id, val || null)
                        }
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue
                            placeholder={matchup.slotB.participant?.name ?? "— Empty —"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Empty (Bye) —</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {matchup.slotB.participant?.logo_url && (
                        <img
                          src={matchup.slotB.participant.logo_url}
                          alt=""
                          className="h-6 w-6 rounded object-cover border border-primary/30"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slots Grid View */}
          {viewMode === "slots" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
              {bracketSlots.map((_, slotIdx) => {
                const assigned = slotAssignments.get(slotIdx);
                const assignedParticipant = assigned ? partMap[assigned] : null;

                return (
                  <div
                    key={slotIdx}
                    className="border border-primary/30 rounded-lg p-2 bg-card/50 space-y-1.5"
                  >
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Slot {slotIdx + 1}
                    </div>
                    <Select
                      value={assigned ?? ""}
                      onValueChange={(val) =>
                        onAssignParticipant(slotIdx, val || null)
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue
                          placeholder={
                            assignedParticipant?.name ?? "— Empty —"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Empty (Bye) —</SelectItem>
                        {participants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignedParticipant?.logo_url && (
                      <img
                        src={assignedParticipant.logo_url}
                        alt=""
                        className="h-5 w-5 rounded object-cover border border-primary/30"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="btn-luxury" onClick={onGenerate}>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Bracket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
