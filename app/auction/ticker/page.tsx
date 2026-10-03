import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { AuctionTicker } from "@/components/auction/auction-ticker";

export default async function AuctionTickerPage() {
  const supabase = await createClient();
  const initial = await fetchAuctionSnapshot(supabase);
  return <AuctionTicker initial={initial} />;
}
