"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { STAT_FIELDS } from "@/lib/registration";
import {
  editPlayerStats,
  type EditStatsState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Inline editor for a player's self-reported career stats. Many registrants
 * entered "NA" (or wrong figures) — the admin corrects them here. An empty box
 * clears the value (stored as NULL). Saving refreshes the stats-based category
 * suggestion on the next load.
 */
export function EditStatsForm({
  playerId,
  stats,
}: {
  playerId: string;
  stats: Record<string, string | null | undefined>;
}) {
  const [state, formAction, pending] = useActionState<EditStatsState, FormData>(
    editPlayerStats,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="player_id" value={playerId} />

      {state.error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-primary">
          <Check className="size-4" /> Stats saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`stat_${f.key}`}
              className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
            >
              {f.label}
            </label>
            <input
              id={`stat_${f.key}`}
              name={f.key}
              type="text"
              defaultValue={stats[f.key] ?? ""}
              placeholder="—"
              className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm border border-primary/50 px-4 py-2 font-heading text-sm font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Stats
        </button>
      </div>
    </form>
  );
}
