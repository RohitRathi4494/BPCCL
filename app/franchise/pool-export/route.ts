import { requireFranchiseOwner } from "@/lib/auth";
import { getApprovedPool, getSoldPlayerIds } from "@/lib/queries/franchise";
import { buildPoolExport } from "@/lib/exports/workbook";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  // Guard: franchise owner only. The pool view is staff/owner readable.
  await requireFranchiseOwner();

  try {
    const [pool, soldIds] = await Promise.all([
      getApprovedPool(),
      getSoldPlayerIds(),
    ]);
    // Only players still available (not already on any squad).
    const sold = new Set(soldIds);
    const available = pool.filter((p) => p.id && !sold.has(p.id));
    const { buffer, filename } = await buildPoolExport(available);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("pool export error:", e);
    return new Response("Could not build the export. Please try again.", {
      status: 500,
    });
  }
}
