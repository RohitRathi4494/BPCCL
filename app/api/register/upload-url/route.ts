import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPrivateUploadUrl } from "@/lib/storage";
import { isValidDocKind, isStorableDocType, type DocKind } from "@/lib/storage/docs";

/**
 * Issue a short-lived presigned PUT URL for a private registration doc.
 *
 * This is a Route Handler (not a Server Action) on purpose: the browser uploads
 * straight to R2 immediately after this returns, and a Server Action triggers a
 * client RSC refresh that can abort that in-flight cross-origin upload. A plain
 * route handler + fetch avoids that. The object KEY is still server-generated.
 */
export async function POST(req: NextRequest) {
  let body: { kind?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { kind, contentType } = body;

  if (!isValidDocKind(kind)) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }
  if (!contentType || !isStorableDocType(kind, contentType)) {
    return NextResponse.json({ error: "Unsupported file type for this document." }, { status: 400 });
  }

  // Only issue upload URLs while registration is open.
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_settings")
    .select("registration_open")
    .limit(1)
    .maybeSingle();
  if (data && data.registration_open === false) {
    return NextResponse.json({ error: "Registrations are now closed." }, { status: 403 });
  }

  try {
    const { key, url } = await createPrivateUploadUrl(kind as DocKind, contentType);
    return NextResponse.json({ key, url });
  } catch (e) {
    console.error("upload-url:", e);
    return NextResponse.json(
      { error: "Could not start the upload. Please try again." },
      { status: 500 },
    );
  }
}
