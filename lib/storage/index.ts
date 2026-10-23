/**
 * Storage abstraction for player photos.
 *
 * The rest of the app calls `uploadPlayerPhoto(...)` and gets back a public URL —
 * it does NOT care whether the bytes land on Cloudflare R2 or Supabase Storage.
 * This keeps us free to switch providers without touching the upload UI.
 *
 * Provider selection:
 *   - `PHOTO_STORAGE_PROVIDER=r2|supabase` forces a provider, else
 *   - R2 is used when fully configured (see `r2Configured`), else
 *   - Supabase Storage (the legacy `player-photos` public bucket) is the fallback.
 *
 * SERVER ONLY — imported solely from `"use server"` actions. Never import from a
 * client component (the R2 provider pulls in the AWS SDK + secret env).
 */
import { createClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "@/lib/registration";
import { r2Configured, r2Upload } from "@/lib/storage/r2";

export type UploadResult = { url: string };

export type PhotoUploadInput = {
  bytes: Uint8Array;
  contentType: string;
  /** File extension without the dot, e.g. "webp" | "jpg". */
  ext: string;
};

type Provider = "r2" | "supabase";

function chosenProvider(): Provider {
  const forced = process.env.PHOTO_STORAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "r2" || forced === "supabase") return forced;
  return r2Configured() ? "r2" : "supabase";
}

/** Upload a (compressed) player photo and return its public URL. */
export async function uploadPlayerPhoto(
  input: PhotoUploadInput,
): Promise<UploadResult> {
  const key = `players/${crypto.randomUUID()}.${input.ext}`;

  if (chosenProvider() === "r2") {
    const url = await r2Upload(key, input.bytes, input.contentType);
    return { url };
  }

  // Supabase fallback — anon client is enough for the public bucket's insert policy.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(key, input.bytes, {
      contentType: input.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`supabase upload: ${error.message}`);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(key);
  return { url: data.publicUrl };
}
