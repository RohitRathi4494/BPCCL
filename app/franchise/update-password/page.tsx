import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { getCurrentProfile } from "@/lib/auth";
import { UpdatePasswordForm } from "@/components/franchise/update-password-form";

export const metadata: Metadata = {
  title: "Set New Franchise Password",
  robots: { index: false, follow: false },
};

export default async function FranchiseUpdatePasswordPage() {
  // Reaching this page requires the recovery session set by the
  // /franchise/reset-password route handler. If it's missing, the link was
  // invalid, expired, or already used — send them to request a fresh one.
  const profile = await getCurrentProfile();
  const hasSession = profile !== null;

  return (
    <div className="grass-stripes flex min-h-dvh flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark showSeason />
          <p className="mt-2 font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
            Franchise Portal
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h1 className="mb-1 font-heading text-xl font-bold tracking-wide text-foreground uppercase">
            Choose a new password
          </h1>
          {hasSession ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                Set a new password for your franchise account. You&apos;ll sign
                in with it next time.
              </p>
              <UpdatePasswordForm />
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                This password-reset link has expired or was already used.
                Request a new one to continue.
              </p>
              <Link
                href="/franchise/forgot-password"
                className="inline-flex w-full items-center justify-center rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)]"
              >
                Request a new link
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
