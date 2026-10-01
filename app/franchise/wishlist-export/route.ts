import { requireFranchiseOwner } from "@/lib/auth";
import { getApprovedPool, getWishlist } from "@/lib/queries/franchise";
import { buildWishlistExport } from "@/lib/exports/workbook";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  // Guard: franchise owner only. RLS scopes the wishlist to their franchise.
  const { franchise } = await requireFranchiseOwner();

  try {
    const pool = await getApprovedPool();
    const wishlist = await getWishlist(pool);
    const { buffer, filename } = await buildWishlistExport(
      franchise.name,
      wishlist,
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("wishlist export error:", e);
    return new Response("Could not build the export. Please try again.", {
      status: 500,
    });
  }
}
