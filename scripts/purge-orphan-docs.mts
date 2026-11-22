/* =============================================================================
 * Purge ORPHAN private documents from the Cloudflare R2 PRIVATE bucket.
 *
 * Private docs (Aadhaar + payment screenshots) are uploaded straight from the
 * browser via a presigned PUT, then the registration form submits the returned
 * object KEY. If a browser uploads but the form is never submitted (abandoned),
 * the object is an orphan referenced by no player row.
 *
 * This deletes private objects that are BOTH:
 *   - older than 24h (LastModified), so an in-flight registration is never hit, and
 *   - not referenced by any players.aadhaar_doc_key / players.payment_screenshot_key.
 *
 * DRY RUN by default; pass --go to delete.
 *   npx tsx scripts/purge-orphan-docs.mts        # dry run
 *   npx tsx scripts/purge-orphan-docs.mts --go   # delete
 *
 * Requires env (same as the app): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET.
 * ========================================================================== */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
(globalThis as Record<string, unknown>).WebSocket ??= class {} as never;
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const GO = process.argv.includes("--go");
const PREFIX = "docs/";
const AGE_MS = 24 * 60 * 60 * 1000; // 24h

function requireEnv(names: string[]) {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.log("Missing env vars:", missing.join(", "));
    process.exit(1);
  }
}
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PRIVATE_BUCKET",
]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const BUCKET = process.env.R2_PRIVATE_BUCKET!;
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ---- Referenced keys (from player rows) ------------------------------------
const referenced = new Set<string>();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("players")
    .select("aadhaar_doc_key, payment_screenshot_key")
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  if (!data || !data.length) break;
  for (const r of data) {
    if (r.aadhaar_doc_key) referenced.add(r.aadhaar_doc_key as string);
    if (r.payment_screenshot_key) referenced.add(r.payment_screenshot_key as string);
  }
  if (data.length < 1000) break;
}

// ---- Every private object under docs/ --------------------------------------
type Obj = { key: string; size: number; age: number };
const objects: Obj[] = [];
let token: string | undefined;
const now = Date.now();
do {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }),
  );
  for (const it of res.Contents ?? []) {
    if (!it.Key) continue;
    const lm = it.LastModified ? it.LastModified.getTime() : now;
    objects.push({ key: it.Key, size: it.Size ?? 0, age: now - lm });
  }
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

const orphans = objects.filter((o) => !referenced.has(o.key) && o.age > AGE_MS);
const youngUnref = objects.filter((o) => !referenced.has(o.key) && o.age <= AGE_MS);
const kb = (n: number) => (n / 1024).toFixed(0) + " KB";
const orphanBytes = orphans.reduce((a, b) => a + b.size, 0);

console.log(`\nPurge orphan docs in "${BUCKET}"  ${GO ? "(LIVE --go)" : "(DRY RUN)"}\n`);
console.log(`Total objects under ${PREFIX}:     ${objects.length}`);
console.log(`Referenced by a player row:        ${objects.filter((o) => referenced.has(o.key)).length} (keep)`);
console.log(`Unreferenced but < 24h old:        ${youngUnref.length} (keep — may be in-flight)`);
console.log(`Orphans to delete (>24h, unref):   ${orphans.length}   ${kb(orphanBytes)}`);

if (!GO) {
  console.log("\nDRY RUN — nothing deleted. Re-run with --go.\n");
  process.exit(0);
}

let removed = 0;
for (let i = 0; i < orphans.length; i += 1000) {
  const batch = orphans.slice(i, i + 1000).map((o) => ({ Key: o.key }));
  const res = await s3.send(
    new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch } }),
  );
  removed += res.Deleted?.length ?? 0;
  if (res.Errors?.length) {
    console.log(`  ${res.Errors.length} delete errors in batch @${i}`);
  }
  console.log(`  removed ${removed}/${orphans.length}`);
}
console.log(`\n✅ Deleted ${removed} orphan docs; reclaimed ${kb(orphanBytes)}.\n`);
