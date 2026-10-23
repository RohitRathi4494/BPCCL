"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/registration";
import { compressImage } from "@/lib/images/compress";
import { uploadPhoto } from "@/app/register/photo-actions";

/**
 * Player photo upload. Compresses the chosen image in the browser (resize to
 * ~500px longest edge + re-encode to ~120 KB) and hands the small blob to the
 * `uploadPhoto` server action, which stores it via the storage abstraction
 * (Cloudflare R2, or Supabase as fallback) and returns a public URL. That URL is
 * reported to the parent form via `onUploaded` (submitted as `photo_url`).
 */
export function PhotoUpload({
  value,
  onUploaded,
  error,
}: {
  value: string;
  onUploaded: (url: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLocalError(null);
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      setLocalError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setLocalError("Image must be under 5 MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      // Shrink the full-res phone photo to a small WebP/JPEG before it leaves
      // the device — nothing multi-MB is ever uploaded or stored.
      const { blob, type } = await compressImage(file);
      const ext = type === "image/webp" ? "webp" : "jpg";
      const fd = new FormData();
      fd.append("file", blob, `photo.${ext}`);

      const result = await uploadPhoto(fd);
      setUploading(false);
      if (result.error || !result.url) {
        console.error("photo upload:", result.error);
        setLocalError(result.error ?? "Upload failed — please try again.");
        setPreview(null);
        return;
      }
      onUploaded(result.url);
    } catch (e) {
      console.error("photo upload:", e);
      setUploading(false);
      setLocalError("Couldn't process that image — please try another.");
      setPreview(null);
    }
  }

  function clear() {
    setPreview(null);
    setLocalError(null);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const shown = preview ?? (value || null);

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Player Photo <span className="text-primary">*</span>
      </span>

      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-input bg-background">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Preview" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground/60" />
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary disabled:opacity-60"
            >
              {value ? "Replace" : "Upload photo"}
            </button>
            {(preview || value) && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:text-[var(--closed)]"
              >
                <X className="size-3.5" /> Remove
              </button>
            )}
          </div>
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
            JPG / PNG / WebP · max 5 MB
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {(localError || error) && (
        <p className="text-xs text-[var(--closed)]">{localError ?? error}</p>
      )}
    </div>
  );
}
