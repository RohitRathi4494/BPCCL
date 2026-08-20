"use client";

import { useActionState, useState } from "react";
import { Trash2, Loader2, Check, X } from "lucide-react";
import {
  deletePlayer,
  type DeleteState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Delete control for a registration row. Two-step to prevent accidents:
 * a trash icon that expands into "Delete? ✓ ✕". The confirm submits the
 * admin-only server action; on success the list revalidates and the row
 * disappears.
 */
export function DeletePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    deletePlayer,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={`Delete ${playerName}`}
        aria-label={`Delete ${playerName}`}
        className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)]"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="player_id" value={playerId} />
      <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        {state.error ?? "Delete?"}
      </span>
      <button
        type="submit"
        disabled={pending}
        title="Confirm delete"
        aria-label="Confirm delete"
        className="inline-flex size-8 items-center justify-center rounded-sm border border-[var(--closed)] bg-[var(--closed)]/10 text-[var(--closed)] transition-colors hover:bg-[var(--closed)] hover:text-white disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        title="Cancel"
        aria-label="Cancel delete"
        className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
      >
        <X className="size-4" />
      </button>
    </form>
  );
}
