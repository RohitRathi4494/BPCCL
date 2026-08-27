"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

export type PoolOption = {
  id: string;
  full_name: string;
  assigned_category: string | null;
};

/**
 * Compact searchable player picker. Filters the supplied (already-available)
 * pool by name/category and fires onPick with the chosen player's id.
 */
export function PlayerSearch({
  players,
  onPick,
  disabled,
  placeholder = "Search players…",
  busy,
}: {
  players: PoolOption[];
  onPick: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? players.filter(
          (p) =>
            p.full_name.toLowerCase().includes(needle) ||
            (p.assigned_category ?? "").toLowerCase().includes(needle),
        )
      : players;
    return list.slice(0, 40);
  }, [players, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          disabled={disabled || busy}
          placeholder={placeholder}
          className="w-full rounded-sm border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
        />
      </div>

      {open && !disabled && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-border bg-card py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No available players match.
            </li>
          ) : (
            filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    setQuery("");
                    setOpen(false);
                    onPick(p.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-background"
                >
                  <span className="truncate">{p.full_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      {p.assigned_category ?? "—"}
                    </span>
                    <Plus className="size-3.5 shrink-0 text-primary" />
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
