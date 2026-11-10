import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getFixtures } from "@/lib/queries/matches";
import { createClient } from "@/lib/supabase/server";
import { FixturesManager } from "@/components/admin/fixtures-manager";

export const metadata: Metadata = {
  title: "Fixtures",
  robots: { index: false, follow: false },
};

export default async function AdminFixturesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [fixtures, { data: franchises }] = await Promise.all([
    getFixtures(),
    supabase.from("franchises").select("id, name, short_code").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
          Fixtures
        </h1>
        <p className="text-sm text-muted-foreground">
          Build the season schedule — add each match, set its group, venue, date
          and time, then record the result once it&apos;s played. Everything
          here publishes to the public{" "}
          <span className="text-foreground/80">Fixtures</span> page and points
          table.
        </p>
      </div>

      <FixturesManager fixtures={fixtures} teams={franchises ?? []} />
    </div>
  );
}
