/**
 * Cloudflare R2 storage provider (S3-compatible).
 *
 * R2 is reached via the AWS S3 SDK pointed at the account's R2 endpoint. Secrets
 * live only in server env — this module must never be imported from client code
 * (it is only used by the server storage abstraction in `lib/storage`).
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** True only when every R2 env var is present, so callers can pick a provider. */
export function r2Configured(): boolean {
  return Boolean(
    env("R2_ACCOUNT_ID") &&
      env("R2_ACCESS_KEY_ID") &&
      env("R2_SECRET_ACCESS_KEY") &&
      env("R2_BUCKET") &&
      env("R2_PUBLIC_URL"),
  );
}

let client: S3Client | null = null;
function r2Client(): S3Client {
  if (client) return client;
  const accountId = env("R2_ACCOUNT_ID")!;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID")!,
      secretAccessKey: env("R2_SECRET_ACCESS_KEY")!,
    },
  });
  return client;
}

/** Upload bytes to R2 under `key`; returns the public URL for the stored object. */
export async function r2Upload(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: env("R2_BUCKET")!,
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
