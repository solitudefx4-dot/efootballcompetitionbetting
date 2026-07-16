import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wand2, GripVertical } from "lucide-react";

export type TParticipant = { id: string; name: string; logo_url: string | null; is_eliminated?: boolean; current_round?: number; is_disqualified?: boolean };

type BracketPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: TParticipant[];
  bracketSlots: (string | null)[];
  slotAssignments: Map<number, string | null>;
  onAssign: (slotIndex: number, participantId: string | null) => void;
  onGenerate: () => void;
  onCancel: () => void;
};

export function BracketPreviewDialog({
  open,
  onOpenChange,
  participants,
  bracketSlots,
  slotAssignments,
  onAssign,
  onGenerate,
  onCancel,
}: BracketPreviewDialogProps) {
  const participantMap = useMemo(() => Object.fromEntries(participants.map((p) => [p.id, p])), [participants]);

  // Map slots to their bracket positions
  const matchupPreview = useMemo(() => {
    const matchups: Array<{ slotA: number; slotB: number; matchIdx: number }> = [];
    for (let i = 0; i < bracketSlots.length; i += 2) {
      matchups.push({ slotA: i, slotB: i + 1, matchIdx: matchups.length });
    }
    return matchups;
  }, [bracketSlots]);

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
            Assign participants to bracket slots and see matchups before generating. Use the dropdowns to assign participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info banner */}
          <div className="rounded-lg bg-amber-900/20 border border-amber-600/40 p-3 text-sm">
            <p className="text-amber-100">
              <strong>Your {participants.length} participants</strong> will fill <strong>{bracketSlots.length} bracket slots</strong> (rounded to nearest power of 2).
              <br />
              <span className="text-xs text-amber-200/80">
                Pairs below are matchups: Slot 1 vs 2, Slot 3 vs 4, etc. Winners advance automatically.
              </span>
            </p>
          </div>

          {/* Live bracket preview */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground font-bold">OPENING ROUND MATCHUPS</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {matchupPreview.map(({ slotA, slotB, matchIdx }) => {
                const pA = slotAssignments.get(slotA);
                const pB = slotAssignments.get(slotB);
                const partA = pA ? participantMap[pA] : null;
                const partB = pB ? participantMap[pB] : null;

                return (
                  <div
                    key={matchIdx}
                    className="rounded-lg border border-primary/30 bg-card/40 p-3 space-y-2"
                  >
                    <div className="text-xs font-bold text-muted-foreground">MATCHUP {matchIdx + 1}</div>
                    
                    {/* Slot A */}
                    <div className="flex items-center gap-2 p-2 rounded bg-card border border-primary/20">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Slot {slotA + 1}</div>
                        <div className="text-sm font-semibold text-primary truncate">
                          {partA?.name || "— Empty (Bye) —"}
                        </div>
                      </div>
                      <Select value={pA ?? ""} onValueChange={(val) => onAssign(slotA, val || null)}>
                        <SelectTrigger className="w-8 h-8 p-0 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Clear</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* VS separator */}
                    <div className="text-center text-xs font-bold text-primary/60">VS</div>

                    {/* Slot B */}
                    <div className="flex items-center gap-2 p-2 rounded bg-card border border-primary/20">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Slot {slotB + 1}</div>
                        <div className="text-sm font-semibold text-primary truncate">
                          {partB?.name || "— Empty (Bye) —"}
                        </div>
                      </div>
                      <Select value={pB ?? ""} onValueChange={(val) => onAssign(slotB, val || null)}>
                        <SelectTrigger className="w-8 h-8 p-0 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Clear</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot assignments grid (detailed view) */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground font-bold">ALL SLOTS</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {bracketSlots.map((_, slotIdx) => {
                const assigned = slotAssignments.get(slotIdx);
                const assignedParticipant = assigned ? participantMap[assigned] : null;

                return (
                  <div key={slotIdx} className="border border-primary/30 rounded-lg p-2 bg-card/50">
                    <div className="text-xs text-muted-foreground mb-1 font-bold">Slot {slotIdx + 1}</div>
                    <Select value={assigned ?? ""} onValueChange={(val) => onAssign(slotIdx, val || null)}>
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue placeholder={assignedParticipant?.name ?? "Empty"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Empty —</SelectItem>
                        {participants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="btn-luxury" onClick={onGenerate}>
            <Wand2 className="h-4 w-4 mr-1" />
            Generate Bracket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
