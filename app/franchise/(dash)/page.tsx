import { requireFranchiseOwner } from "@/lib/auth";
import {
  getApprovedPool,
  getWishlist,
  getSquad,
} from "@/lib/queries/franchise";
import { FranchiseDashboard } from "@/components/franchise/franchise-dashboard";

export default async function FranchiseDashboardPage() {
  const { franchise } = await requireFranchiseOwner();
  const pool = await getApprovedPool();
  const [wishlist, squad] = await Promise.all([
    getWishlist(pool),
    getSquad(franchise.id, pool),
  ]);

  return (
    <FranchiseDashboard
      franchise={{
        id: franchise.id,
        name: franchise.name,
        purse_total: franchise.purse_total,
        purse_remaining: franchise.purse_remaining,
      }}
      pool={pool}
      wishlist={wishlist}
      squad={squad}
    />
  );
}
