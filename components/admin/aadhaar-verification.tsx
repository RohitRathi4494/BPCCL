"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  setAadhaarVerification,
  type AadhaarVerifyState,
} from "@/app/admin/(protected)/registrations/actions";
import { PrivateDocViewer } from "@/components/admin/private-doc-viewer";

/**
 * Admin control for Aadhaar *identity verification*. The masked Aadhaar is kept
 * in the PRIVATE bucket and viewed via a short-lived presigned URL. Marking the
 * player verified permanently DELETES the stored image and keeps only a boolean
 * (+ optional last 4 digits) as the record.
 */
export function AadhaarVerification({
  playerId,
  verified,
  last4,
  aadhaarDocKey,
}: {
  playerId: string;
  verified: boolean;
  last4: string | null;
  aadhaarDocKey: string | null;
}) {
  const [state, formAction, pending] = useActionState<AadhaarVerifyState, FormData>(
    setAadhaarVerification,
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // If an image is on file and the admin is marking verified, warn that
        // saving permanently deletes the stored Aadhaar image.
        if (!aadhaarDocKey) return;
        const checked = (
          e.currentTarget.elements.namedItem("aadhaar_verified") as HTMLInputElement | null
        )?.checked;
        if (
          checked &&
          !window.confirm(
            "Marking this player verified will permanently delete the uploaded Aadhaar image. Continue?",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="player_id" value={playerId} />

      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Aadhaar Verification
        </span>
      </div>

      {aadhaarDocKey ? (
        <PrivateDocViewer playerId={playerId} kind="aadhaar" label="View Aadhaar" />
      ) : (
        <span className="text-xs text-muted-foreground">
          {verified
            ? "Verified — the Aadhaar image was deleted."
            : "No Aadhaar image on file."}
        </span>
      )}

      <label className="flex items-start gap-3 text-sm text-foreground/90">
        <input
          type="checkbox"
          name="aadhaar_verified"
          defaultChecked={verified}
          className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
        />
        <span>
          Identity verified — I checked the player&apos;s masked Aadhaar. Saving
          as verified <span className="font-semibold">deletes the stored image</span>.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="aadhaar_last4"
          className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
        >
          Last 4 digits (optional)
        </label>
        <input
          id="aadhaar_last4"
          name="aadhaar_last4"
          inputMode="numeric"
          maxLength={4}
          defaultValue={last4 ?? ""}
          placeholder="e.g. 1234"
          className="w-32 rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-fit items-center gap-2 rounded-sm border border-border px-3.5 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </button>
        {state.saved && (
          <span className="inline-flex items-center gap-1 text-xs text-accent">
            <CheckCircle2 className="size-3.5" /> Saved
          </span>
        )}
        {state.error && (
          <span className="text-xs text-[var(--closed)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
