import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type LinkableMatch = {
  id: string;
  name: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

/**
 * Searchable combo-box for picking a live match to link to a bracket slot.
 * No pagination — the full match list is rendered inside a virtualized-friendly
 * command list with client-side search on name / status / score.
 */
export function MatchSelectCombo({
  value,
  matches,
  onChange,
  placeholder = "— not linked —",
}: {
  value: string;
  matches: LinkableMatch[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => matches.find((m) => m.id === value) ?? null, [matches, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected
              ? `${selected.name} · ${selected.home_score ?? 0}–${selected.away_score ?? 0} (${selected.status})`
              : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[60vh]" align="start">
        <Command
          filter={(itemValue, search) => {
            const q = search.toLowerCase();
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name, status or score…" />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>No matches found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__ not linked"
                onSelect={() => { onChange(""); setOpen(false); }}
              >
                <Check className={cn("h-4 w-4 mr-2", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">— not linked —</span>
              </CommandItem>
              {matches.map((m) => {
                const search = `${m.name} ${m.status} ${m.home_score ?? 0}-${m.away_score ?? 0}`;
                const isLive = m.status === "live";
                return (
                  <CommandItem
                    key={m.id}
                    value={`${search} ${m.id}`}
                    onSelect={() => { onChange(m.id); setOpen(false); }}
                    className="gap-2"
                  >
                    <Check className={cn("h-4 w-4", value === m.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 min-w-0 truncate">{m.name}</span>
                    <span className="text-[10px] tabular-nums text-amber-300 font-bold">
                      {m.home_score ?? 0}–{m.away_score ?? 0}
                    </span>
                    <span className={cn(
                      "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border",
                      isLive
                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                        : m.status === "ended"
                        ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        : "border-muted-foreground/30 text-muted-foreground bg-muted/20",
                    )}>
                      {isLive && <Radio className="inline h-2 w-2 mr-0.5 animate-pulse" />}
                      {m.status}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="px-2 py-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
          {matches.length} match{matches.length === 1 ? "" : "es"} available
        </div>
      </PopoverContent>
    </Popover>
  );
}