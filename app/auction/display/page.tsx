import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { AuctionDisplay } from "@/components/auction/auction-display";

export const metadata: Metadata = {
  title: "Auction · Live",
  description: "Live auction big screen.",
};

export default async function AuctionDisplayPage() {
  const supabase = await createClient();
  const [initial, sponsorsR] = await Promise.all([
    fetchAuctionSnapshot(supabase),
    supabase
      .from("sponsors")
      .select("id, name, logo_url, tier")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  return <AuctionDisplay initial={initial} sponsors={sponsorsR.data ?? []} />;
}
