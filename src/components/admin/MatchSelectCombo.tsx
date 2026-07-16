import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface Match {
  id: string;
  name: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface MatchSelectComboProps {
  matches: Match[];
  value: string;
  onChange: (matchId: string) => void;
  placeholder?: string;
}

export function MatchSelectCombo({
  matches,
  value,
  onChange,
  placeholder = "Search matches...",
}: MatchSelectComboProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filter matches by search query
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    
    const query = searchQuery.toLowerCase();
    return matches.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      `${m.home_score ?? 0}–${m.away_score ?? 0}`.includes(query) ||
      m.status.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  const selectedMatch = matches.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-primary/30 bg-card shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {/* No Link Option */}
              <button
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors border-b border-primary/10"
              >
                <span className="text-muted-foreground">— not linked —</span>
              </button>

              {filteredMatches.length > 0 ? (
                filteredMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => {
                      onChange(match.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors border-b border-primary/10 last:border-b-0 ${
                      value === match.id ? "bg-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{match.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {match.home_score ?? 0}–{match.away_score ?? 0} · {match.status}
                        </div>
                      </div>
                      {value === match.id && (
                        <span className="text-primary text-xs font-bold">✓</span>
                      )}
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                  No matches found for "{searchQuery}"
                </div>
              ) : (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                  No matches available
                </div>
              )}
            </div>

            {/* Footer with match count */}
            {matches.length > 0 && (
              <div className="px-3 py-2 bg-card/50 border-t border-primary/10 text-[10px] text-muted-foreground">
                {filteredMatches.length} of {matches.length} matches
              </div>
            )}
          </div>
        )}

        {/* Click outside to close */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      {/* Selected Match Display */}
      {selectedMatch && (
        <div className="rounded-lg border border-primary/20 bg-card/50 p-2">
          <div className="text-xs font-semibold text-primary">Linked Match</div>
          <div className="text-sm font-medium">{selectedMatch.name}</div>
          <div className="text-xs text-muted-foreground">
            Score: {selectedMatch.home_score ?? 0}–{selectedMatch.away_score ?? 0} · Status: {selectedMatch.status}
          </div>
        </div>
      )}
    </div>
  );
}
