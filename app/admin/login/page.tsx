import type { Metadata } from "next";
import { BrandMark } from "@/components/site/brand-mark";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const notice =
    params.error === "forbidden"
      ? "Please sign in with an admin account to continue."
      : undefined;

  return (
    <div className="grass-stripes flex min-h-dvh flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark showSeason />
          <p className="mt-2 font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
            Admin Console
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <LoginForm notice={notice} />
        </div>
      </div>
    </div>
  );
}
