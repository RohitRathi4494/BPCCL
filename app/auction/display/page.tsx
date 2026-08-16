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
  const initial = await fetchAuctionSnapshot(supabase);
  return <AuctionDisplay initial={initial} />;
}
