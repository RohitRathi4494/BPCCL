"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  autoAssignCategories,
  type AutoAssignState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Fills in a stats-based category for every player that doesn't have one yet.
 * Manual (admin-set) categories are left untouched.
 */
export function AutoAssignButton() {
  const [state, formAction, pending] = useActionState<AutoAssignState, FormData>(
    autoAssignCategories,
    {},
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        title="Assign a category to players who don't have one, from their stats"
        className="inline-flex items-center gap-2 rounded-sm border border-primary px-3.5 py-2 font-heading text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        Auto-assign categories
      </button>
      {state.error ? (
        <span className="text-xs text-[var(--closed)]">{state.error}</span>
      ) : state.assigned !== undefined ? (
        <span className="text-xs text-accent">
          {state.assigned === 0
            ? "All players already have a category."
            : `Assigned ${state.assigned} player${state.assigned === 1 ? "" : "s"}.`}
        </span>
      ) : null}
    </form>
  );
}
