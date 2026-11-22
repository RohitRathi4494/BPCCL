"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, IndianRupee } from "lucide-react";
import {
  setPaymentVerified,
  type PaymentVerifyState,
} from "@/app/admin/(protected)/registrations/actions";
import { PrivateDocViewer } from "@/components/admin/private-doc-viewer";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

/**
 * Admin payment panel: shows the UTR + amount, opens the payment screenshot via
 * a presigned URL, and records payment verification (sets verified_at/by).
 */
export function PaymentVerification({
  playerId,
  utr,
  amount,
  hasScreenshot,
  verified,
}: {
  playerId: string;
  utr: string | null;
  amount: number | null;
  hasScreenshot: boolean;
  verified: boolean;
}) {
  const [state, formAction, pending] = useActionState<PaymentVerifyState, FormData>(
    setPaymentVerified,
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IndianRupee className="size-4 text-primary" />
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Payment
        </span>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-accent/40 px-2 py-0.5 font-mono text-[10px] tracking-wider text-accent uppercase">
            <CheckCircle2 className="size-3" /> Verified
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            UPI Transaction ID (UTR)
          </span>
          <span className="font-mono text-sm text-foreground">{utr || "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Amount Paid
          </span>
          <span className="text-sm text-foreground">
            {amount != null ? `₹${inr(amount)}` : "—"}
          </span>
        </div>
      </div>

      {hasScreenshot ? (
        <PrivateDocViewer
          playerId={playerId}
          kind="payment"
          label="View payment screenshot"
        />
      ) : (
        <span className="text-xs text-muted-foreground">
          No payment screenshot on file.
        </span>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="player_id" value={playerId} />
        <label className="flex items-start gap-3 text-sm text-foreground/90">
          <input
            type="checkbox"
            name="payment_verified"
            defaultChecked={verified}
            className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
          />
          <span>Payment verified — I confirmed the UTR against the screenshot.</span>
        </label>
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
    </div>
  );
}
