/**
 * Storage abstraction. SERVER ONLY — imported solely from `"use server"` actions.
 * Never import from a client component (the R2 provider pulls in the AWS SDK +
 * secret env).
 *
 * PUBLIC photos  → `uploadPublicPhoto()` stores to R2 (public bucket) or, in dev,
 *                  falls back to Supabase Storage. Returns a public URL.
 * PRIVATE docs   → `createPrivateUploadUrl()` / `getPrivateViewUrl()` /
 *                  `deletePrivateObject()`. Aadhaar + payment screenshots live in
 *                  the private R2 bucket; the DB stores the object KEY only, never
 *                  a URL. There is NO Supabase fallback for private docs.
 */
import { createClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "@/lib/registration";
import {
  r2PublicConfigured,
  r2PrivateConfigured,
  r2UploadPublic,
  r2PublicUrl,
  r2DeletePublic,
  r2PresignPrivatePut,
  r2PresignPrivateGet,
  r2DeletePrivate,
} from "@/lib/storage/r2";
import {
  type DocKind,
  isStorableDocType,
  DOC_EXT_BY_TYPE,
} from "@/lib/storage/docs";

export type UploadResult = { url: string };

export type PhotoUploadInput = {
  bytes: Uint8Array;
  contentType: string;
  /** File extension without the dot, e.g. "webp" | "jpg". */
  ext: string;
};

type PublicProvider = "r2" | "supabase";

function chosenPublicProvider(): PublicProvider {
  const forced = process.env.PHOTO_STORAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "r2" || forced === "supabase") return forced;
  return r2PublicConfigured() ? "r2" : "supabase";
}

/** Upload a (compressed) player photo and return its PUBLIC url. */
export async function uploadPublicPhoto(
  input: PhotoUploadInput,
): Promise<UploadResult> {
  const key = `players/${crypto.randomUUID()}.${input.ext}`;

  if (chosenPublicProvider() === "r2") {
    const url = await r2UploadPublic(key, input.bytes, input.contentType);
    return { url };
  }

  // Dev fallback only: anon client is enough for the public bucket's insert policy.
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

/** True when the public R2 bucket is configured (ground media lives there). */
export function publicStorageConfigured(): boolean {
  return r2PublicConfigured();
}

export type PublicObjectInput = {
  /** Full object key, e.g. "ground/uuid.webp". The caller owns the prefix. */
  key: string;
  bytes: Uint8Array;
  contentType: string;
};

/**
 * Upload an arbitrary object to the PUBLIC R2 bucket under a caller-chosen key
 * (ground photos, video posters, client logos, the hero loop). Unlike
 * `uploadPublicPhoto`, the key is explicit so admin content can be namespaced.
 * R2-only: there is no Supabase fallback for ground media.
 */
export async function uploadPublicObject(
  input: PublicObjectInput,
): Promise<UploadResult> {
  if (!r2PublicConfigured()) {
    throw new Error("Public media storage (Cloudflare R2) is not configured.");
  }
  const url = await r2UploadPublic(input.key, input.bytes, input.contentType);
  return { url };
}

/** Resolve a stored PUBLIC key to its full URL (no network call). */
export function publicObjectUrl(key: string): string {
  return r2PublicUrl(key);
}

/** Permanently delete a PUBLIC object by key (ignores "not configured"). */
export async function deletePublicObject(key: string): Promise<void> {
  if (!r2PublicConfigured()) return;
  await r2DeletePublic(key);
}

/** How long a private upload / view URL stays valid (5 minutes). */
export const PRIVATE_URL_TTL_SECONDS = 300;

export type PrivateUploadTarget = { key: string; url: string };

/**
 * Create a presigned PUT target for a private doc. The KEY is generated on the
 * server (`docs/{kind}/{uuid}.{ext}`) so the client can never choose where bytes
 * land. Throws if the content type isn't storable for this kind, or if the
 * private bucket isn't configured (no Supabase fallback for private docs).
 */
export async function createPrivateUploadUrl(
  kind: DocKind,
  contentType: string,
): Promise<PrivateUploadTarget> {
  if (!isStorableDocType(kind, contentType)) {
    throw new Error("Unsupported file type for this document.");
  }
  if (!r2PrivateConfigured()) {
    throw new Error("Private document storage (R2) is not configured.");
  }
  const ext = DOC_EXT_BY_TYPE[contentType];
  if (!ext) throw new Error("Unsupported file type for this document.");
  const key = `docs/${kind}/${crypto.randomUUID()}.${ext}`;
  const url = await r2PresignPrivatePut(
    key,
    contentType,
    PRIVATE_URL_TTL_SECONDS,
  );
  return { key, url };
}

/** Short-lived presigned GET URL for an admin to view a private object. */
export async function getPrivateViewUrl(
  key: string,
  ttlSeconds: number = PRIVATE_URL_TTL_SECONDS,
): Promise<string> {
  if (!r2PrivateConfigured()) {
    throw new Error("Private document storage (R2) is not configured.");
  }
  return r2PresignPrivateGet(key, ttlSeconds);
}

/** Permanently delete a private object (e.g. after Aadhaar is verified). */
export async function deletePrivateObject(key: string): Promise<void> {
  if (!r2PrivateConfigured()) {
    throw new Error("Private document storage (R2) is not configured.");
  }
  await r2DeletePrivate(key);
}
