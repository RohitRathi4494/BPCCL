"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PHOTO_BUCKET,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
} from "@/lib/registration";

/**
 * Player photo upload. Uploads to the public `player-photos` Storage bucket
 * from the browser (anon), then reports the public URL to the parent form via
 * `onUploaded` (which stores it and submits it as `photo_url`).
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

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    setUploading(false);
    if (upErr) {
      console.error("photo upload:", upErr.message);
      setLocalError("Upload failed — please try again.");
      setPreview(null);
      return;
    }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    onUploaded(data.publicUrl);
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
