import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { AuctionSetup } from "@/components/auction/auction-setup";

export const metadata: Metadata = {
  title: "Auction Setup",
  robots: { index: false, follow: false },
};

export default async function AuctionSetupPage() {
  const supabase = await createClient();
  const initial = await fetchAuctionSnapshot(supabase);
  return <AuctionSetup initial={initial} />;
}
