import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PoolDisplay } from "@/components/pools/pool-display";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pool Creation",
  description: `${site.shortName} ${site.season} — live pool creation display.`,
  robots: { index: false, follow: false },
};

export default async function PoolsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("franchises")
    .select("name, short_code")
    .order("name", { ascending: true });
  return (
    <div className="h-dvh w-full">
      <PoolDisplay franchises={data ?? []} />
    </div>
  );
}
