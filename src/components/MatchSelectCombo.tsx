import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, X } from "lucide-react";

export type MatchType = { id: string; name: string; home_score: number | null; away_score: number | null; status: string };

type MatchSelectComboProps = {
  matches: MatchType[];
  value: string;
  onChange: (matchId: string) => void;
  placeholder?: string;
};

export function MatchSelectCombo({
  matches,
  value,
  onChange,
  placeholder = "— not linked —",
}: MatchSelectComboProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredMatches = useMemo(() => {
    if (!searchTerm) return matches;
    const lower = searchTerm.toLowerCase();
    return matches.filter((m) => m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower));
  }, [matches, searchTerm]);

  const selectedMatch = matches.find((m) => m.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
      >
        <span className="text-sm truncate flex-1">
          {selectedMatch ? (
            <span>
              {selectedMatch.name} · <span className="text-muted-foreground">{selectedMatch.home_score ?? 0}–{selectedMatch.away_score ?? 0}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-input bg-popover shadow-md">
          {/* Search input */}
          <div className="p-2 border-b border-input">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search matches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearchTerm("");
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b border-input"
            >
              — not linked —
            </button>
            {filteredMatches.length > 0 ? (
              filteredMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => {
                    onChange(match.id);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b border-input last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate flex-1 font-medium">{match.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span className="font-bold">{match.home_score ?? 0}–{match.away_score ?? 0}</span>
                      <span className="capitalize px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{match.status}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matches found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
