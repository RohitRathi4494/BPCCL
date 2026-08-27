"use client";

import { useActionState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import {
  resetToPending,
  type ResetState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Moves an approved/rejected player back to "pending" — to undo a mistaken
 * review decision. Only rendered when the player isn't already pending.
 */
export function ResetStatusButton({ playerId }: { playerId: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetToPending,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="player_id" value={playerId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-4 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Undo2 className="size-3.5" />
        )}
        Move back to pending
      </button>
      {state.error && (
        <span className="text-xs text-[var(--closed)]">{state.error}</span>
      )}
    </form>
  );
}
