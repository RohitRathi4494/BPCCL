import { createClient } from "@/lib/supabase/server";
import { buildExport, type ExportDataset } from "@/lib/exports/workbook";

const VALID: ExportDataset[] = [
  "registrations",
  "franchises",
  "auction-setup",
  "auction-results",
  "squad-list",
  "wishlists",
  "all",
];

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await params;
  if (!VALID.includes(dataset as ExportDataset)) {
    return new Response("Unknown export.", { status: 404 });
  }

  // Route handlers bypass the (protected) layout, so guard here directly.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return new Response("Admins only.", { status: 403 });
  }

  try {
    const { buffer, filename } = await buildExport(
      supabase,
      dataset as ExportDataset,
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("export error:", e);
    return new Response("Could not build the export. Please try again.", {
      status: 500,
    });
  }
}
