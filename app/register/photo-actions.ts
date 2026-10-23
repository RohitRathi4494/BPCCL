"use server";

import { uploadPlayerPhoto } from "@/lib/storage";
import { PHOTO_MIME_TYPES } from "@/lib/registration";

export type PhotoUploadResult = { url?: string; error?: string };

// The client compresses to ~100–150 KB before sending; this is a generous safety
// cap so an uncompressed full-res image can never slip through to storage.
const MAX_UPLOAD_BYTES = 1_200_000; // ~1.2 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * Receive a (client-compressed) player photo and store it via the storage
 * abstraction (Cloudflare R2, or Supabase as fallback). Public endpoint — mirrors
 * the previous anonymous client-side upload, with type + size validation. Returns
 * the public URL to drop into the form's `photo_url` hidden field.
 */
export async function uploadPhoto(
  formData: FormData,
): Promise<PhotoUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No image was provided." };
  if (!PHOTO_MIME_TYPES.includes(file.type)) {
    return { error: "Use a JPG, PNG or WebP image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image is too large — please try a different photo." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";

  try {
    const { url } = await uploadPlayerPhoto({
      bytes,
      contentType: file.type,
      ext,
    });
    return { url };
  } catch (e) {
    console.error("uploadPhoto:", e);
    return { error: "Upload failed — please try again." };
  }
}
