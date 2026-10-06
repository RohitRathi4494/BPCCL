import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchAuctionSnapshot } from "@/lib/auction/snapshot";
import { PostAuctionManager } from "@/components/admin/post-auction-manager";

export const metadata: Metadata = {
  title: "Post-Auction Squad Edits",
  description:
    "Release, add, or swap players on any franchise after the auction.",
  robots: { index: false, follow: false },
};

export default async function PostAuctionPage() {
  const supabase = await createClient();
  const initial = await fetchAuctionSnapshot(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
          Post-Auction Squad Edits
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Make squad changes on a franchise&apos;s behalf after the auction.{" "}
          <strong className="text-foreground">Replace</strong> swaps a player for
          an unsold one and keeps the team&apos;s spend exactly the same (the new
          player inherits the old price).{" "}
          <strong className="text-foreground">Add</strong> brings in an unsold
          player at their category base price (the team must be able to afford
          it).{" "}
          <strong className="text-foreground">Release</strong> drops a player and
          refunds the full price paid. Only auction-bought players can be
          released or replaced — owners, retentions and legends are locked.
        </p>
      </div>

      <PostAuctionManager initial={initial} />
    </div>
  );
}
