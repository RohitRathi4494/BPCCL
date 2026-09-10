"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { franchiseLogin, type LoginState } from "@/app/franchise/actions";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function FranchiseLoginForm({
  notice,
  success,
}: {
  notice?: string;
  success?: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    franchiseLogin,
    {},
  );
  const message = state.error ?? notice;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {success && !state.error && (
        <p className="rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
          {success}
        </p>
      )}
      {message && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {message}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={fieldClass} placeholder="owner@franchise.in" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <Link
            href="/franchise/forgot-password"
            className="font-mono text-[11px] tracking-wide text-muted-foreground normal-case transition-colors hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" className={fieldClass} placeholder="••••••••" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
