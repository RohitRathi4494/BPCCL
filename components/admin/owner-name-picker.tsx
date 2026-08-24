"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import type { PlayerOption } from "@/app/admin/(protected)/franchises/page";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";

/**
 * Owner name picker constrained to the registered-players list. The admin can
 * type to search, but a value is only committed by choosing a player from the
 * dropdown — free-typed names are reverted on blur. The committed name is what
 * gets submitted via the parent form (through the `value` the parent holds).
 */
export function OwnerNamePicker({
  players,
  value,
  onChange,
}: {
  players: PlayerOption[];
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the search box in sync if the committed value changes elsewhere.
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    setQuery(value);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? players.filter(
          (p) =>
            p.full_name.toLowerCase().includes(needle) ||
            (p.registration_code ?? "").toLowerCase().includes(needle),
        )
      : players;
    return list.slice(0, 50);
  }, [players, query]);

  const commit = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  const revert = () => {
    // Free-typed text that isn't an exact player name is discarded.
    const match = players.some((p) => p.full_name === query.trim());
    if (!match) setQuery(value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder="Search registered players…"
          className={fieldClass + " pr-16"}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so an option click registers before we revert/close.
            blurTimer.current = setTimeout(revert, 150);
          }}
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              aria-label="Clear owner"
              className="text-muted-foreground hover:text-[var(--closed)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit("")}
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </div>
      </div>

      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-border bg-card py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No registered players match.
            </li>
          ) : (
            filtered.map((p) => {
              const active = p.full_name === value;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    // onMouseDown fires before the input's onBlur revert.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                      commit(p.full_name);
                    }}
                    className={
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background " +
                      (active ? "text-primary" : "text-foreground")
                    }
                  >
                    <span className="truncate">{p.full_name}</span>
                    <span className="flex items-center gap-2">
                      {p.registration_code && (
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                          {p.registration_code}
                        </span>
                      )}
                      {active && <Check className="size-3.5 shrink-0" />}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
