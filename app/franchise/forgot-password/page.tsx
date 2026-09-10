import type { Metadata } from "next";
import { BrandMark } from "@/components/site/brand-mark";
import { ForgotPasswordForm } from "@/components/franchise/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Franchise Password",
  robots: { index: false, follow: false },
};

export default async function FranchiseForgotPasswordPage({
  searchParams,
}: PageProps<"/franchise/forgot-password">) {
  const params = await searchParams;
  const notice =
    params.error === "expired"
      ? "That reset link has expired or was already used. Request a new one below."
      : undefined;

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
            Reset your password
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter the email linked to your franchise account and we&apos;ll send
            you a link to set a new password.
          </p>
          <ForgotPasswordForm notice={notice} />
        </div>
      </div>
    </div>
  );
}
