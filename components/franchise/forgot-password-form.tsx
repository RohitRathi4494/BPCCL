"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  franchiseRequestPasswordReset,
  type ForgotPasswordState,
} from "@/app/franchise/actions";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function ForgotPasswordForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(franchiseRequestPasswordReset, {});

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-3 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            If that email is linked to a franchise account, a password-reset
            link is on its way. Check your inbox (and spam) and follow the link
            to set a new password.
          </p>
        </div>
        <Link
          href="/franchise/login"
          className="text-center text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.error}
        </p>
      )}
      {notice && !state.error && (
        <p className="rounded-sm border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
          placeholder="owner@franchise.in"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link
        href="/franchise/login"
        className="text-center text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        Back to sign in
      </Link>
    </form>
  );
}
