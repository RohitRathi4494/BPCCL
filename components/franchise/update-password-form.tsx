"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  franchiseUpdatePassword,
  type UpdatePasswordState,
} from "@/app/franchise/actions";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<
    UpdatePasswordState,
    FormData
  >(franchiseUpdatePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fieldClass}
          placeholder="At least 8 characters"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fieldClass}
          placeholder="Re-enter your password"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
