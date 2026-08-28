"use client";

import { useActionState, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import {
  emailAadhaarReminders,
  type ReminderState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Emails all non-rejected players missing an Aadhaar with their ID + the
 * self-service link. Two-step (confirm) because it sends outward bulk email.
 */
export function AadhaarReminderButton() {
  const [state, formAction, pending] = useActionState<ReminderState, FormData>(
    emailAadhaarReminders,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  const result =
    state.sent !== undefined
      ? `Sent ${state.sent}` +
        (state.skipped ? `, ${state.skipped} skipped (no SMTP)` : "") +
        (state.failed ? `, ${state.failed} failed` : "") +
        "."
      : null;

  if (!confirming) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-3.5 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
        >
          <Mail className="size-3.5" /> Email Aadhaar reminders
        </button>
        {state.error && (
          <span className="text-xs text-[var(--closed)]">{state.error}</span>
        )}
        {result && <span className="text-xs text-accent">{result}</span>}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setConfirming(false)}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted-foreground">
        Email every player still missing an Aadhaar?
      </span>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-sm bg-primary px-3.5 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Mail className="size-3.5" />
        )}
        Send reminders
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="inline-flex items-center rounded-sm border border-border px-3 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
