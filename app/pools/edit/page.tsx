import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PoolEditor } from "@/components/pools/pool-editor";

export const metadata: Metadata = {
  title: "Pool Creation · Edit",
  description: "Drag teams into Group A / Group B.",
  robots: { index: false, follow: false },
};

export default async function PoolsEditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("franchises")
    .select("name, short_code")
    .order("name", { ascending: true });
  return <PoolEditor franchises={data ?? []} />;
}
