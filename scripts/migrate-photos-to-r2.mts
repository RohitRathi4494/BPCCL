/* =============================================================================
 * One-time migration: Supabase `player-photos` → Cloudflare R2 (compressed).
 *
 * For each player photo still hosted on Supabase this:
 *   1. downloads the original from Supabase Storage,
 *   2. compresses it (≤500px longest edge, WebP, ~100–150 KB — same rule as the
 *      live upload path),
 *   3. uploads the compressed image to R2,
 *   4. points players.photo_url at the new R2 URL,
 * and records every step in a local MANIFEST so the Supabase originals can be
 * deleted later — only after you confirm the R2 URLs load across the app.
 *
 * IDEMPOTENT & RESUMABLE: safe to re-run. Rows whose photo_url already points at
 * R2 are skipped; a manifest entry from a crashed run is reused (no re-upload,
 * no duplicate R2 object) and only the DB update is retried.
 *
 * PHASES (nothing is destructive except the explicit delete phase):
 *   npx tsx scripts/migrate-photos-to-r2.mts            # plan  (read-only report)
 *   npx tsx scripts/migrate-photos-to-r2.mts migrate    # copy+compress+repoint
 *   npx tsx scripts/migrate-photos-to-r2.mts delete-originals --confirm-r2-verified
 *       # ^ deletes Supabase originals — run ONLY after verifying R2 across the app
 *
 * Requires env (same as the app): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BUCKET, R2_PUBLIC_URL.
 * ========================================================================== */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
(globalThis as Record<string, unknown>).WebSocket ??= class {} as never;

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// ---- Config ----------------------------------------------------------------
const BUCKET = "player-photos";
const SUPABASE_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const MANIFEST = "scripts/photo-r2-migration.manifest.json";
const MAX_EDGE = 500;
const TARGET_BYTES = 140_000; // aim ~100–150 KB
const phase = (process.argv[2] ?? "plan").toLowerCase();

const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + " MB";
const kb = (n: number) => (n / 1024).toFixed(0) + " KB";

function requireEnv(names: string[]) {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.log("Missing env vars:", missing.join(", "));
    process.exit(1);
  }
}

// ---- Clients ----------------------------------------------------------------
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function r2() {
  requireEnv([
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BUCKET",
    "R2_PUBLIC_URL",
  ]);
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const base = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");
  return { s3, base };
}

// ---- Manifest (local, crash-safe) ------------------------------------------
type Entry = {
  playerId: string;
  oldPath: string; // object path inside the Supabase bucket
  oldUrl: string;
  r2Key: string;
  r2Url: string;
  bytesBefore: number;
  bytesAfter: number;
  deletedFromSupabase?: boolean;
};
function loadManifest(): Entry[] {
  if (!existsSync(MANIFEST)) return [];
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8")) as Entry[];
  } catch {
    return [];
  }
}
function saveManifest(rows: Entry[]) {
  writeFileSync(MANIFEST, JSON.stringify(rows, null, 2));
}

// ---- Helpers ---------------------------------------------------------------
/** Pull the object path out of a Supabase public player-photos URL, else null. */
function supabasePath(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf(SUPABASE_PATH_MARKER);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + SUPABASE_PATH_MARKER.length));
}

/** Map every object path in the bucket to its byte size (for the before-report). */
async function sizeMap(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  async function walk(prefix = "") {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100, offset });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      for (const it of data) {
        const p = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id === null || it.metadata === null) await walk(p);
        else out.set(p, Number(it.metadata?.size ?? 0));
      }
      if (data.length < 100) break;
      offset += 100;
    }
  }
  await walk();
  return out;
}

type PlayerRow = { id: string; photo_url: string };
async function playersWithPhotos(): Promise<PlayerRow[]> {
  const rows: PlayerRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("players")
      .select("id, photo_url")
      .not("photo_url", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as PlayerRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Resize ≤MAX_EDGE longest edge + encode WebP, stepping quality toward target. */
async function compress(buf: Buffer): Promise<Buffer> {
  const base = sharp(buf, { failOn: "none" })
    .rotate() // honour EXIF orientation
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  let best: Buffer | null = null;
  for (const quality of [82, 72, 62, 52, 42]) {
    const out = await base.clone().webp({ quality }).toBuffer();
    if (!best || out.length < best.length) best = out;
    if (out.length <= TARGET_BYTES) return out;
  }
  return best!;
}

// ---- Phases ----------------------------------------------------------------
async function plan() {
  console.log("\n=== PHOTO MIGRATION — PLAN (read-only) ===\n");
  const [players, sizes] = await Promise.all([playersWithPhotos(), sizeMap()]);
  const manifest = loadManifest();
  const doneIds = new Set(manifest.map((m) => m.playerId));

  let toMigrate = 0;
  let alreadyR2 = 0;
  let missingObject = 0;
  let bytesBefore = 0;
  for (const p of players) {
    const path = supabasePath(p.photo_url);
    if (!path) {
      alreadyR2++;
      continue;
    }
    toMigrate++;
    const size = sizes.get(path);
    if (size === undefined) missingObject++;
    else bytesBefore += size;
  }

  const bucketTotal = [...sizes.values()].reduce((a, b) => a + b, 0);
  const estAfter = toMigrate * 0.125 * 1024 * 1024; // ~125 KB each estimate

  console.log(`Players with a photo_url:         ${players.length}`);
  console.log(`  → still on Supabase (migrate):   ${toMigrate}`);
  console.log(`  → already on R2 / non-Supabase:  ${alreadyR2}`);
  console.log(`  → referenced object missing:     ${missingObject}`);
  console.log(`Already recorded in manifest:      ${doneIds.size}`);
  console.log("");
  console.log(`Supabase bucket "${BUCKET}" total:  ${sizes.size} files   ${mb(bucketTotal)}`);
  console.log(`Bytes to migrate (referenced):     ${mb(bytesBefore)}`);
  console.log(`Estimated size AFTER compression:  ~${mb(estAfter)} on R2 (≈125 KB/photo)`);
  console.log(`Estimated Supabase reclaimed:      ~${mb(bytesBefore)} once originals deleted`);
  console.log("\nNo changes made. Run with `migrate` to perform the migration.\n");
}

async function migrate() {
  console.log("\n=== PHOTO MIGRATION — MIGRATE ===\n");
  const { s3, base } = r2();
  const players = await playersWithPhotos();
  const manifest = loadManifest();
  const byId = new Map(manifest.map((m) => [m.playerId, m]));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const p of players) {
    const path = supabasePath(p.photo_url);
    if (!path) {
      skipped++; // already on R2 / non-Supabase URL
      continue;
    }

    try {
      let entry = byId.get(p.id);

      // Resume case: already uploaded to R2 in a prior run but DB not repointed.
      if (entry && entry.oldUrl === p.photo_url) {
        const { error: updErr } = await supabase
          .from("players")
          .update({ photo_url: entry.r2Url })
          .eq("id", p.id)
          .eq("photo_url", entry.oldUrl);
        if (updErr) throw new Error(`db update (resume): ${updErr.message}`);
        bytesBefore += entry.bytesBefore;
        bytesAfter += entry.bytesAfter;
        migrated++;
        console.log(`  resumed  ${p.id}  → ${entry.r2Url}`);
        continue;
      }

      // 1) download original
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
      if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? "no data"}`);
      const original = Buffer.from(await blob.arrayBuffer());

      // 2) compress
      const compressed = await compress(original);

      // 3) upload to R2
      const r2Key = `players/${randomUUID()}.webp`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_PUBLIC_BUCKET!,
          Key: r2Key,
          Body: compressed,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      const r2Url = `${base}/${r2Key}`;

      // record BEFORE repointing the DB, so a crash leaves a recoverable manifest
      entry = {
        playerId: p.id,
        oldPath: path,
        oldUrl: p.photo_url,
        r2Key,
        r2Url,
        bytesBefore: original.length,
        bytesAfter: compressed.length,
      };
      byId.set(p.id, entry);
      saveManifest([...byId.values()]);

      // 4) repoint the DB (guarded by the old URL so concurrent edits are safe)
      const { error: updErr } = await supabase
        .from("players")
        .update({ photo_url: r2Url })
        .eq("id", p.id)
        .eq("photo_url", p.photo_url);
      if (updErr) throw new Error(`db update: ${updErr.message}`);

      bytesBefore += original.length;
      bytesAfter += compressed.length;
      migrated++;
      console.log(`  migrated ${p.id}  ${kb(original.length)} → ${kb(compressed.length)}`);
    } catch (e) {
      failed++;
      console.log(`  FAILED   ${p.id}: ${(e as Error).message}`);
    }
  }

  saveManifest([...byId.values()]);
  console.log("\n--- migrate summary ---");
  console.log(`migrated: ${migrated}   skipped(already R2): ${skipped}   failed: ${failed}`);
  console.log(`size before (originals): ${mb(bytesBefore)}`);
  console.log(`size after  (on R2):     ${mb(bytesAfter)}`);
  console.log(`manifest: ${MANIFEST}`);
  if (failed === 0) {
    console.log("\n✅ All referenced photos migrated. Verify R2 URLs load across the app,");
    console.log("   THEN run: delete-originals --confirm-r2-verified\n");
  } else {
    console.log("\n⚠️  Some rows failed — re-run `migrate` (idempotent) before deleting.\n");
  }
}

async function deleteOriginals() {
  console.log("\n=== PHOTO MIGRATION — DELETE SUPABASE ORIGINALS ===\n");
  if (!process.argv.includes("--confirm-r2-verified")) {
    console.log("Refusing: pass --confirm-r2-verified once you've confirmed the R2");
    console.log("URLs load correctly across the app. Nothing deleted.\n");
    process.exit(1);
  }
  const manifest = loadManifest();
  const pending = manifest.filter((m) => !m.deletedFromSupabase);
  if (pending.length === 0) {
    console.log("Nothing to delete (manifest empty or all already deleted).\n");
    return;
  }

  // Safety: never delete an original whose player row still points at Supabase
  // (i.e. the repoint didn't stick). Only delete when the DB is on R2.
  // Fetch in chunks — a single .in() over hundreds of UUIDs makes an over-long
  // URL that can fail the request outright.
  const ids = pending.map((m) => m.playerId);
  const urlById = new Map<string, string | null>();
  const CHUNK = 80;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    for (let attempt = 0; ; attempt++) {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, photo_url")
          .in("id", chunk);
        if (error) throw new Error(error.message);
        for (const r of data ?? []) urlById.set(r.id, r.photo_url as string | null);
        break;
      } catch (e) {
        if (attempt >= 2) {
          console.log(`DB check failed (chunk @${i}):`, (e as Error).message);
          process.exit(1);
        }
      }
    }
  }

  let deleted = 0;
  let reclaimed = 0;
  let heldBack = 0;
  const BATCH = 100;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const safe = slice.filter((m) => {
      const live = urlById.get(m.playerId);
      const stillSupabase = live && supabasePath(live) !== null;
      if (stillSupabase) heldBack++;
      return !stillSupabase; // only delete originals whose row is now on R2
    });
    if (safe.length === 0) continue;
    const { data, error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove(safe.map((m) => m.oldPath));
    if (rmErr) {
      console.log(`remove batch @${i} FAILED:`, rmErr.message);
      process.exit(1);
    }
    for (const m of safe) {
      m.deletedFromSupabase = true;
      reclaimed += m.bytesBefore;
    }
    deleted += data?.length ?? safe.length;
    saveManifest(manifest);
    console.log(`  deleted ${deleted}/${pending.length}`);
  }

  saveManifest(manifest);
  console.log("\n--- delete summary ---");
  console.log(`deleted from Supabase: ${deleted}`);
  console.log(`held back (row not yet on R2): ${heldBack}`);
  console.log(`reclaimed: ${mb(reclaimed)}`);
  console.log("");
}

// ---- Dispatch --------------------------------------------------------------
if (phase === "plan") await plan();
else if (phase === "migrate") await migrate();
else if (phase === "delete-originals") await deleteOriginals();
else {
  console.log(`Unknown phase "${phase}". Use: plan | migrate | delete-originals`);
  process.exit(1);
}
