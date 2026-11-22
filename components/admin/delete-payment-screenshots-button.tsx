"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import {
  deleteVerifiedPaymentScreenshots,
  type PurgePaymentState,
} from "@/app/admin/(protected)/exports/actions";

/**
 * Two-step bulk delete of stored payment screenshots for players whose payment
 * is already verified. UTR + verified flags are kept; only the images go.
 */
export function DeletePaymentScreenshotsButton() {
  const [state, formAction, pending] = useActionState<PurgePaymentState, FormData>(
    deleteVerifiedPaymentScreenshots,
    {},
  );
  const [armed, setArmed] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="inline-flex items-center gap-2 rounded-sm border border-[var(--closed)]/40 px-4 py-2 font-heading text-xs font-bold tracking-wide text-[var(--closed)] uppercase transition-colors hover:bg-[var(--closed)]/10"
        >
          <Trash2 className="size-3.5" /> Delete verified payment screenshots
        </button>
      ) : (
        <>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--closed)] px-4 py-2 font-heading text-xs font-bold tracking-wide text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Yes, delete them
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            disabled={pending}
            className="inline-flex items-center rounded-sm border border-border px-4 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary"
          >
            Cancel
          </button>
        </>
      )}

      {state.deleted != null && (
        <span className="inline-flex items-center gap-1 text-xs text-accent">
          <CheckCircle2 className="size-3.5" /> Deleted {state.deleted} screenshot
          {state.deleted === 1 ? "" : "s"}.
        </span>
      )}
      {state.error && (
        <span className="text-xs text-[var(--closed)]">{state.error}</span>
      )}
    </form>
  );
}
