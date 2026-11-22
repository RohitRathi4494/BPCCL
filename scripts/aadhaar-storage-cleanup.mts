/* =============================================================================
 * ⚠️  DESTRUCTIVE — AADHAAR DATA DELETION  ⚠️
 *
 * Permanently deletes ALL stored Aadhaar files and clears the DB pointers:
 *   1. removes every object in the private `player-aadhaar` storage bucket, then
 *   2. sets `players.aadhaar_path = NULL` for every row that still has one.
 *
 * We keep the `aadhaar_path` / `aadhaar_reminded_at` columns (just emptied) and
 * do NOT touch `aadhaar_verified` / `aadhaar_last4` — identity verification
 * stays intact; only the sensitive IMAGES go away.
 *
 * SAFE BY DEFAULT: this is a DRY RUN unless you pass --go. The dry run lists how
 * many files would be deleted and how many rows would be nulled, deleting NOTHING.
 *
 *   Dry run (safe):   npx tsx scripts/aadhaar-storage-cleanup.mts
 *   DELETE for real:  npx tsx scripts/aadhaar-storage-cleanup.mts --go
 *
 * DO NOT run with --go until you have a backup and have approved the deletion.
 * This cannot be undone.
 * ========================================================================== */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
(globalThis as Record<string, unknown>).WebSocket ??= class {} as never;
import { createClient } from "@supabase/supabase-js";

const BUCKET = "player-aadhaar";
const GO = process.argv.includes("--go");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Recursively collect every file path under a prefix.
async function listAll(prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset });
    if (error) throw new Error(`list("${prefix}") -> ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // folders have a null id / no metadata; recurse into them
      if (item.id === null || item.metadata === null) {
        out.push(...(await listAll(path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

console.log(`\n⚠️  AADHAAR CLEANUP — bucket "${BUCKET}"  ${GO ? "(LIVE --go)" : "(DRY RUN)"}\n`);

// --- Enumerate what will be deleted -----------------------------------------
let paths: string[];
try {
  paths = await listAll();
} catch (e) {
  console.log("LIST FAILED:", (e as Error).message);
  process.exit(1);
}

const { count: rowsWithPath } = await supabase
  .from("players")
  .select("id", { count: "exact", head: true })
  .not("aadhaar_path", "is", null);

console.log(`Storage files to delete:        ${paths.length}`);
console.log(`players rows to null aadhaar_path: ${rowsWithPath ?? "?"}`);
// Show a sample of the exact file paths so the operator can eyeball them.
console.log("\nSample of file paths (up to 20):");
for (const p of paths.slice(0, 20)) console.log("  " + p);
if (paths.length > 20) console.log(`  …and ${paths.length - 20} more`);

if (!GO) {
  console.log("\nDRY RUN — nothing was deleted. Re-run with --go to delete for real.\n");
  process.exit(0);
}

// --- 1) Delete the storage objects in batches -------------------------------
console.log("\nDeleting storage objects…");
let removed = 0;
for (let i = 0; i < paths.length; i += 100) {
  const batch = paths.slice(i, i + 100);
  const { data, error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) {
    console.log(`remove batch @${i} FAILED:`, error.message);
    process.exit(1);
  }
  removed += data?.length ?? batch.length;
  console.log(`  removed ${removed}/${paths.length}`);
}

// --- 2) Null the DB pointers ------------------------------------------------
console.log("\nNulling players.aadhaar_path…");
const { error: updErr, count: nulled } = await supabase
  .from("players")
  .update({ aadhaar_path: null }, { count: "exact" })
  .not("aadhaar_path", "is", null);
if (updErr) {
  console.log("DB update FAILED:", updErr.message);
  console.log("(Files were deleted; re-run to retry the DB null-out.)");
  process.exit(1);
}

console.log(`\n✅ DONE. Deleted ${removed} files; nulled aadhaar_path on ${nulled ?? "?"} rows.\n`);
