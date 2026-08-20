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
  redirectTo,
  label,
}: {
  playerId: string;
  playerName: string;
  /** Where to send the admin after a successful delete (e.g. the list). */
  redirectTo?: string;
  /** When set, render a full labelled button instead of an icon-only one. */
  label?: string;
}) {
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    deletePlayer,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  const hidden = (
    <>
      <input type="hidden" name="player_id" value={playerId} />
      {redirectTo && (
        <input type="hidden" name="redirect_to" value={redirectTo} />
      )}
    </>
  );

  // ---- Labelled variant (review page) ----
  if (label) {
    if (!confirming) {
      return (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[var(--closed)]/60 px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-[var(--closed)] uppercase transition-colors hover:bg-[var(--closed)] hover:text-white"
        >
          <Trash2 className="size-4" /> {label}
        </button>
      );
    }
    return (
      <form action={formAction} className="flex flex-col gap-2">
        {hidden}
        <p className="text-xs text-muted-foreground">
          {state.error ?? "This permanently removes the registration. Continue?"}
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[var(--closed)] px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // ---- Icon-only variant (list rows) ----
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
      {hidden}
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
