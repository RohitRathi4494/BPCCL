/**
 * Client-side image compression for player photos.
 *
 * Phone photos are routinely 2–5 MB; we never want to store those as-is. This
 * resizes to a max longest edge (default 500px) and re-encodes to WebP (falling
 * back to JPEG where WebP isn't supported), stepping the quality down until the
 * result is roughly under `targetBytes` (~120 KB). Runs entirely in the browser
 * via <canvas>, so no full-res bytes ever leave the device.
 */

export type CompressedImage = {
  blob: Blob;
  /** "image/webp" or "image/jpeg". */
  type: string;
};

export type CompressOptions = {
  /** Longest side, in px, after resize. Never upscales. */
  maxEdge?: number;
  /** Soft byte target; quality is reduced toward this. */
  targetBytes?: number;
};

/** True if the browser's canvas can actually encode WebP. */
function canEncodeWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/** Decode a File into something drawable, honouring EXIF orientation. */
async function decode(
  file: File,
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  // Preferred path: createImageBitmap applies EXIF orientation with the option.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // fall through to the <img> path
    }
  }

  // Fallback: load via an <img> element (browsers apply orientation on render).
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read the image."));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressedImage> {
  const maxEdge = opts.maxEdge ?? 500;
  const targetBytes = opts.targetBytes ?? 120_000;

  const src = await decode(file);
  try {
    const longest = Math.max(src.width, src.height) || 1;
    const scale = Math.min(1, maxEdge / longest); // never upscale
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");
    // White matte so transparent PNGs don't turn black when encoded to JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    src.draw(ctx, w, h);

    const type = canEncodeWebp() ? "image/webp" : "image/jpeg";

    // Step quality down until we're under the target (or hit the floor). Keep the
    // smallest blob we produced so we always return something.
    let best: Blob | null = null;
    for (const q of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const blob = await toBlob(canvas, type, q);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) {
        best = blob;
        break;
      }
    }

    if (!best) throw new Error("Could not compress the image.");
    return { blob: best, type };
  } finally {
    src.cleanup();
  }
}
