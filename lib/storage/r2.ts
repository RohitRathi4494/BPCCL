/**
 * Cloudflare R2 storage provider (S3-compatible).
 *
 * TWO buckets, both configured purely through env vars (never hard-code a bucket
 * name, account id, or r2.dev URL):
 *
 *   PUBLIC  — R2_PUBLIC_BUCKET + R2_PUBLIC_URL. Player photos only. Objects are
 *             world-readable via the public r2.dev / custom domain.
 *   PRIVATE — R2_PRIVATE_BUCKET. Aadhaar + payment screenshots. NO public URL,
 *             ever. Objects are only ever reached through a short-lived
 *             presigned GET generated server-side for an authenticated admin.
 *
 * R2 is reached via the AWS S3 SDK pointed at the account's R2 endpoint. Secrets
 * live only in server env — this module must never be imported from client code.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function creds() {
  return {
    accountId: env("R2_ACCOUNT_ID"),
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  };
}

/** True when the credentials + PUBLIC bucket (+ public URL) are all present. */
export function r2PublicConfigured(): boolean {
  const c = creds();
  return Boolean(
    c.accountId &&
      c.accessKeyId &&
      c.secretAccessKey &&
      env("R2_PUBLIC_BUCKET") &&
      env("R2_PUBLIC_URL"),
  );
}

/** True when the credentials + PRIVATE bucket are present (no public URL needed). */
export function r2PrivateConfigured(): boolean {
  const c = creds();
  return Boolean(
    c.accountId &&
      c.accessKeyId &&
      c.secretAccessKey &&
      env("R2_PRIVATE_BUCKET"),
  );
}

let client: S3Client | null = null;
function r2Client(): S3Client {
  if (client) return client;
  const c = creds();
  if (!c.accountId || !c.accessKeyId || !c.secretAccessKey) {
    throw new Error("R2 is not configured (missing account id / API keys).");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
    // AWS SDK v3 now adds a CRC32 checksum to PutObject by default, which breaks
    // browser presigned PUTs to R2 (the browser can't supply the signed checksum
    // header → the request is aborted). Only compute checksums when R2 requires.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

// --------------------------------------------------------------------------
// PUBLIC bucket (player photos)
// --------------------------------------------------------------------------

/** Upload bytes to the PUBLIC bucket under `key`; returns the public URL. */
export async function r2UploadPublic(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: env("R2_PUBLIC_BUCKET")!,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      // Photos are content-addressed (uuid filename) and never change → cache hard.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = env("R2_PUBLIC_URL")!.replace(/\/+$/, "");
  return `${base}/${key}`;
}

/** Public URL for a key already in the PUBLIC bucket (no network call). */
export function r2PublicUrl(key: string): string {
  const base = env("R2_PUBLIC_URL")!.replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

/** Delete an object from the PUBLIC bucket. */
export async function r2DeletePublic(key: string): Promise<void> {
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: env("R2_PUBLIC_BUCKET")!,
      Key: key,
    }),
  );
}

// --------------------------------------------------------------------------
// PRIVATE bucket (identity + payment docs) — presigned access only
// --------------------------------------------------------------------------

/**
 * Presigned PUT URL so the browser can upload a private doc straight to R2
 * (keeps big files off Vercel's request-size limit). The URL is bound to the
 * exact key + content type and expires after `ttlSeconds`.
 */
export async function r2PresignPrivatePut(
  key: string,
  contentType: string,
  ttlSeconds: number,
): Promise<string> {
  return getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: env("R2_PRIVATE_BUCKET")!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: ttlSeconds },
  );
}

/** Short-lived presigned GET URL for an admin to view a private object. */
export async function r2PresignPrivateGet(
  key: string,
  ttlSeconds: number,
): Promise<string> {
  return getSignedUrl(
    r2Client(),
    new GetObjectCommand({
      Bucket: env("R2_PRIVATE_BUCKET")!,
      Key: key,
    }),
    { expiresIn: ttlSeconds },
  );
}

/** Permanently delete a private object. */
export async function r2DeletePrivate(key: string): Promise<void> {
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: env("R2_PRIVATE_BUCKET")!,
      Key: key,
    }),
  );
}
