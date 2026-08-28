"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AadhaarUpload } from "@/components/site/aadhaar-upload";
import {
  attachAadhaar,
  type AttachState,
} from "@/app/register/aadhaar/actions";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function AadhaarAttachForm() {
  const [state, formAction, pending] = useActionState<AttachState, FormData>(
    attachAadhaar,
    { status: "idle" },
  );
  const [aadhaarPath, setAadhaarPath] = useState("");

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="size-12 text-accent" />
        <p className="text-lg text-foreground">{state.message}</p>
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="registration_code" className={labelClass}>
          Registration ID <span className="text-primary">*</span>
        </label>
        <input
          id="registration_code"
          name="registration_code"
          placeholder="USCL2-XXXXXX"
          autoComplete="off"
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">
          The ID we emailed you when you registered.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClass}>
          Registered Phone Number <span className="text-primary">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Your registered contact number"
          className={fieldClass}
        />
      </div>

      <input type="hidden" name="aadhaar_path" value={aadhaarPath} />
      <AadhaarUpload value={aadhaarPath} onUploaded={setAadhaarPath} />

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Saving…" : "Add Aadhaar Card"}
      </button>
    </form>
  );
}
