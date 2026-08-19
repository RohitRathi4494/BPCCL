"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { reviewPlayer, type ReviewState } from "@/app/admin/(protected)/registrations/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  playerId,
  currentCategory,
  categories,
}: {
  playerId: string;
  currentCategory: string | null;
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    reviewPlayer,
    {},
  );
  const [reason, setReason] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="player_id" value={playerId} />

      {state.error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="assigned_category"
          className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"
        >
          Assign Grade
        </label>
        <select
          id="assigned_category"
          name="assigned_category"
          defaultValue={currentCategory ?? ""}
          className="w-full appearance-none rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">— Select grade —</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          A grade is required to approve.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="rejection_reason"
          className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase"
        >
          Rejection Reason
        </label>
        <textarea
          id="rejection_reason"
          name="rejection_reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required to reject — this exact text is emailed to the player."
          className="w-full resize-y rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60",
          )}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          <Check className="size-4" /> Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm border border-[var(--closed)] px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-[var(--closed)] uppercase transition-colors hover:bg-[var(--closed)] hover:text-white disabled:opacity-60"
        >
          <X className="size-4" /> Reject
        </button>
      </div>
    </form>
  );
}
