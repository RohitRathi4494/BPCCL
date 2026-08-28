"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AADHAAR_BUCKET,
  AADHAAR_MAX_BYTES,
  AADHAAR_MIME_TYPES,
} from "@/lib/registration";

/**
 * Aadhaar card upload. Uploads to the PRIVATE `player-aadhaar` bucket (anon may
 * write, only admins may read) and reports the object PATH to the parent form
 * via `onUploaded` (submitted as `aadhaar_path`). Preview is from the local file
 * only — the uploaded object is never publicly readable.
 */
export function AadhaarUpload({
  value,
  onUploaded,
  error,
}: {
  value: string;
  onUploaded: (path: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLocalError(null);
    if (!AADHAAR_MIME_TYPES.includes(file.type)) {
      setLocalError("Use a JPG, PNG, WebP image or a PDF.");
      return;
    }
    if (file.size > AADHAAR_MAX_BYTES) {
      setLocalError("File must be under 5 MB.");
      return;
    }

    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { data, error: upErr } = await supabase.storage
      .from(AADHAAR_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    setUploading(false);
    if (upErr || !data) {
      console.error("aadhaar upload:", upErr?.message);
      setLocalError("Upload failed — please try again.");
      setPreview(null);
      setFileName(null);
      return;
    }
    onUploaded(data.path);
  }

  function clear() {
    setPreview(null);
    setFileName(null);
    setLocalError(null);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Aadhaar Card <span className="text-primary">*</span>
      </span>

      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-input bg-background">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Aadhaar preview" className="size-full object-contain" />
          ) : value || fileName ? (
            <FileText className="size-6 text-primary" />
          ) : (
            <ShieldCheck className="size-6 text-muted-foreground/60" />
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
              {value ? "Replace" : "Upload Aadhaar"}
            </button>
            {value && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:text-[var(--closed)]"
              >
                <X className="size-3.5" /> Remove
              </button>
            )}
          </div>
          <span className="max-w-[16rem] truncate font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
            {fileName ?? "JPG / PNG / WebP / PDF · max 5 MB"}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/80">
        Used only to verify your identity for the league. Stored securely and
        visible only to league admins.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={AADHAAR_MIME_TYPES.join(",")}
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
