import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { BrandMark } from "@/components/site/brand-mark";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  // Already signed in as admin? Skip the form and go straight to the console.
  // Without this, pressing the browser back button from inside the panel lands
  // here and looks like a logout even though the session is still valid.
  const existing = await getCurrentProfile();
  if (existing?.role === "admin") {
    redirect("/admin/registrations");
  }

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
