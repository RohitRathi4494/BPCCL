"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  submitSponsorEnquiry,
  type EnquiryState,
} from "@/app/(marketing)/sponsors/actions";
import { SPONSOR_TIERS } from "@/lib/site";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

const initial: EnquiryState = { status: "idle" };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-[var(--closed)]">{msg}</p>;
}

export function SponsorEnquiryForm() {
  const [state, formAction, pending] = useActionState(
    submitSponsorEnquiry,
    initial,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-primary/40 bg-card p-10 text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
          Enquiry Received
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && state.message && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_name" className={labelClass}>
            Your Name *
          </label>
          <input
            id="contact_name"
            name="contact_name"
            className={fieldClass}
            placeholder="Full name"
          />
          <FieldError msg={state.errors?.contact_name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className={labelClass}>
            Company / Brand *
          </label>
          <input
            id="company"
            name="company"
            className={fieldClass}
            placeholder="Company name"
          />
          <FieldError msg={state.errors?.company} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={fieldClass}
            placeholder="you@company.com"
          />
          <FieldError msg={state.errors?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            className={fieldClass}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tier_interest" className={labelClass}>
          Tier of Interest
        </label>
        <select
          id="tier_interest"
          name="tier_interest"
          defaultValue=""
          className={cn(fieldClass, "appearance-none")}
        >
          <option value="">No preference</option>
          {SPONSOR_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <FieldError msg={state.errors?.tier_interest} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={cn(fieldClass, "resize-y")}
          placeholder="Tell us about your brand and what you're looking for."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(61,123,239,0.55)] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Sending…" : "Send Enquiry"}
      </button>
    </form>
  );
}
