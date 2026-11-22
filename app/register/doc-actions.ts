"use server";

import { createClient } from "@/lib/supabase/server";
import { createPrivateUploadUrl } from "@/lib/storage";
import { isValidDocKind, isStorableDocType, type DocKind } from "@/lib/storage/docs";

export type DocUploadTarget = { key?: string; url?: string; error?: string };

/**
 * Public server action: issue a short-lived presigned PUT URL so the browser can
 * upload a private registration doc (Aadhaar / payment screenshot) STRAIGHT to
 * the private R2 bucket — keeping big files off Vercel's request-size limit.
 *
 * Security: the object KEY is generated server-side (`docs/{kind}/{uuid}.{ext}`),
 * the URL is bound to the exact key + content type, and it expires in 5 minutes.
 * We validate the kind + content type, and refuse once registration is closed.
 */
export async function createDocUploadUrl(
  kind: string,
  contentType: string,
): Promise<DocUploadTarget> {
  if (!isValidDocKind(kind)) return { error: "Invalid document type." };
  if (!isStorableDocType(kind, contentType)) {
    return { error: "Unsupported file type for this document." };
  }

  // Only issue upload URLs while registration is open.
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_settings")
    .select("registration_open")
    .limit(1)
    .maybeSingle();
  if (data && data.registration_open === false) {
    return { error: "Registrations are now closed." };
  }

  try {
    const { key, url } = await createPrivateUploadUrl(kind as DocKind, contentType);
    return { key, url };
  } catch (e) {
    console.error("createDocUploadUrl:", e);
    return { error: "Could not start the upload. Please try again." };
  }
}
