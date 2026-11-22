/* =============================================================================
 * Purge ORPHAN objects from the Supabase `player-photos` bucket.
 *
 * After the R2 migration, every live player photo is served from R2 and no
 * players.photo_url points at Supabase. Any object still in the bucket is an
 * orphan (an upload never linked to a player). This deletes those orphans.
 *
 * SAFETY: it fetches every players.photo_url first and refuses to delete any
 * object that is still referenced by a row (there should be none). DRY RUN by
 * default; pass --go to delete.
 *   npx tsx scripts/purge-orphan-photos.mts        # dry run
 *   npx tsx scripts/purge-orphan-photos.mts --go   # delete
 * ========================================================================== */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
(globalThis as Record<string, unknown>).WebSocket ??= class {} as never;
import { createClient } from "@supabase/supabase-js";

const BUCKET = "player-photos";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
const GO = process.argv.includes("--go");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + " MB";

// Referenced Supabase object paths (should be empty post-migration).
const referenced = new Set<string>();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("players").select("photo_url").range(from, from + 999);
  if (error) throw new Error(error.message);
  if (!data || !data.length) break;
  for (const r of data) {
    const u = r.photo_url as string | null;
    const i = u?.indexOf(MARKER) ?? -1;
    if (u && i !== -1) referenced.add(decodeURIComponent(u.slice(i + MARKER.length)));
  }
  if (data.length < 1000) break;
}

// Every object in the bucket, with size.
const objects: { path: string; size: number }[] = [];
async function walk(prefix = "") {
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    for (const it of data) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null || it.metadata === null) await walk(p);
      else objects.push({ path: p, size: Number(it.metadata?.size ?? 0) });
    }
    if (data.length < 100) break;
    offset += 100;
  }
}
await walk();

const orphans = objects.filter((o) => !referenced.has(o.path));
const referencedStillHere = objects.filter((o) => referenced.has(o.path));
const orphanBytes = orphans.reduce((a, b) => a + b.size, 0);

console.log(`\nPurge orphans in "${BUCKET}"  ${GO ? "(LIVE --go)" : "(DRY RUN)"}\n`);
console.log(`Total objects in bucket:       ${objects.length}`);
console.log(`Still referenced by a row:     ${referencedStillHere.length} (will NOT delete)`);
console.log(`Orphans to delete:             ${orphans.length}   ${mb(orphanBytes)}`);

if (!GO) {
  console.log("\nDRY RUN — nothing deleted. Re-run with --go.\n");
  process.exit(0);
}

let removed = 0;
for (let i = 0; i < orphans.length; i += 100) {
  const batch = orphans.slice(i, i + 100).map((o) => o.path);
  const { data, error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) {
    console.log(`remove batch @${i} FAILED:`, error.message);
    process.exit(1);
  }
  removed += data?.length ?? batch.length;
  console.log(`  removed ${removed}/${orphans.length}`);
}
console.log(`\n✅ Deleted ${removed} orphan files; reclaimed ${mb(orphanBytes)}.\n`);
