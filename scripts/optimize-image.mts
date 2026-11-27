/* =============================================================================
 * Optimize images for the public/ folder.
 *
 * WHY: next.config.ts sets `images.unoptimized: true` (to stay on Vercel's free
 * plan), so next/image serves source files AS-IS — no server-side resize or
 * format conversion. Any oversized file in public/ is downloaded in full by
 * every visitor. So we compress at the source instead: resize + convert to
 * WebP before committing.
 *
 * USAGE:
 *   npx tsx scripts/optimize-image.mts <file...> [--width=N] [--quality=N] [--out=path] [--replace]
 *
 * EXAMPLES:
 *   # Founder / portrait images (card is ~350px wide; 900px covers retina):
 *   npx tsx scripts/optimize-image.mts public/founders/new-person.png --width=900
 *
 *   # Several files at once (each -> <name>.webp beside the source):
 *   npx tsx scripts/optimize-image.mts public/sponsors/*.png --width=600
 *
 *   # Overwrite a specific output path:
 *   npx tsx scripts/optimize-image.mts hero.jpg --width=1600 --out=public/hero.webp
 *
 *   # Also delete the original source file after producing the .webp:
 *   npx tsx scripts/optimize-image.mts public/founders/x.png --width=900 --replace
 *
 * Remember to point the referencing code (e.g. lib/league.config.ts) at the new
 * .webp path. WebP is supported by every browser the site targets.
 * ========================================================================== */
import { statSync, rmSync, renameSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Args = {
  files: string[];
  width: number;
  quality: number;
  out: string | null;
  replace: boolean;
};

function parseArgs(argv: string[]): Args {
  const files: string[] = [];
  let width = 1200;
  let quality = 80;
  let out: string | null = null;
  let replace = false;

  for (const a of argv) {
    if (a.startsWith("--width=")) width = Number(a.slice("--width=".length));
    else if (a.startsWith("--quality=")) quality = Number(a.slice("--quality=".length));
    else if (a.startsWith("--out=")) out = a.slice("--out=".length);
    else if (a === "--replace") replace = true;
    else if (a.startsWith("--")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else files.push(a);
  }

  if (!Number.isFinite(width) || width <= 0) {
    console.error("--width must be a positive number.");
    process.exit(1);
  }
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    console.error("--quality must be between 1 and 100.");
    process.exit(1);
  }
  if (out && files.length > 1) {
    console.error("--out can only be used with a single input file.");
    process.exit(1);
  }
  return { files, width, quality, out, replace };
}

const fmtKB = (bytes: number) => `${(bytes / 1024).toFixed(0)}KB`;

async function optimizeOne(
  src: string,
  { width, quality, out, replace }: Omit<Args, "files">,
): Promise<void> {
  if (!existsSync(src)) {
    console.error(`  ✗ not found: ${src}`);
    return;
  }
  const dir = path.dirname(src);
  const base = path.basename(src, path.extname(src));
  const dest = out ?? path.join(dir, `${base}.webp`);

  // If the destination equals the source (e.g. recompressing a .webp in place),
  // write to a temp file first, then atomically replace.
  const sameAsSrc = path.resolve(dest) === path.resolve(src);
  const writeTo = sameAsSrc ? `${dest}.tmp` : dest;

  const meta = await sharp(src).metadata();
  await sharp(src)
    .rotate() // respect EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(writeTo);

  if (sameAsSrc) renameSync(writeTo, dest);

  const srcSize = statSync(src).size;
  const destSize = statSync(dest).size;
  const saved = srcSize > 0 ? Math.round((1 - destSize / srcSize) * 100) : 0;
  console.log(
    `  ✓ ${src} (${meta.width}x${meta.height}, ${fmtKB(srcSize)})` +
      ` -> ${dest} (${fmtKB(destSize)}, -${saved}%)`,
  );

  if (replace && !sameAsSrc) {
    rmSync(src);
    console.log(`    removed source ${src}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.files.length === 0) {
    console.error(
      "Usage: npx tsx scripts/optimize-image.mts <file...> [--width=N] [--quality=N] [--out=path] [--replace]",
    );
    process.exit(1);
  }
  console.log(`Optimizing ${args.files.length} image(s) @ width=${args.width}, quality=${args.quality}:`);
  for (const f of args.files) {
    await optimizeOne(f, { width: args.width, quality: args.quality, out: args.out, replace: args.replace });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
