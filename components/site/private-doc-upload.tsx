"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/images/compress";
import { createDocUploadUrl } from "@/app/register/doc-actions";
import {
  type DocKind,
  acceptAttr,
  DOC_PDF_TYPE,
  DOC_HEIC_TYPES,
  MAX_RAW_DOC_BYTES,
  MAX_PDF_BYTES,
  DOC_IMAGE_MAX_EDGE,
  DOC_IMAGE_TARGET_BYTES,
} from "@/lib/storage/docs";

/**
 * Imperative handle the parent form uses to upload this doc ON SUBMIT (never on
 * select — that's what created orphan files before). `upload()` is idempotent:
 * once a key is obtained it's reused, so re-submits (e.g. the duplicate-confirm
 * flow) don't create a second object.
 */
export type PrivateDocHandle = {
  hasFile: () => boolean;
  /** Upload the selected doc and return its R2 object key, or null on failure. */
  upload: () => Promise<string | null>;
};

type Prepared = { blob: Blob; type: string; isPdf: boolean };

const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export const PrivateDocUpload = forwardRef<
  PrivateDocHandle,
  { kind: DocKind; label: string; help?: string; error?: string }
>(function PrivateDocUpload({ kind, label, help, error }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    hasFile: () => prepared !== null,
    async upload() {
      if (uploadedKey) return uploadedKey; // idempotent
      if (!prepared) {
        setLocalError("This document is required.");
        return null;
      }
      setBusy(true);
      setLocalError(null);
      try {
        const target = await createDocUploadUrl(kind, prepared.type);
        if (target.error || !target.url || !target.key) {
          setLocalError(target.error ?? "Upload failed — please try again.");
          return null;
        }
        const res = await fetch(target.url, {
          method: "PUT",
          headers: { "Content-Type": prepared.type },
          body: prepared.blob,
        });
        if (!res.ok) {
          setLocalError("Upload failed — please try again.");
          return null;
        }
        setUploadedKey(target.key);
        return target.key;
      } catch (e) {
        console.error("private doc upload:", e);
        setLocalError("Upload failed — please try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
  }));

  async function handleFile(file: File) {
    setLocalError(null);
    setUploadedKey(null); // a new file must re-upload
    setPreview(null);
    setPrepared(null);
    setFileName(null);

    if (file.size > MAX_RAW_DOC_BYTES) {
      setLocalError("File must be under 5 MB. Please pick a smaller file.");
      return;
    }

    const isPdf = file.type === DOC_PDF_TYPE;
    if (isPdf) {
      if (kind !== "aadhaar") {
        setLocalError("PDF isn't accepted here — upload an image.");
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        setLocalError("PDF must be under 1 MB.");
        return;
      }
      setPrepared({ blob: file, type: DOC_PDF_TYPE, isPdf: true });
      setFileName(file.name);
      return;
    }

    // Image (incl. HEIC): compress to a readable, small WebP/JPEG in the browser.
    try {
      const { blob, type } = await compressImage(file, {
        maxEdge: DOC_IMAGE_MAX_EDGE,
        targetBytes: DOC_IMAGE_TARGET_BYTES,
      });
      setPrepared({ blob, type, isPdf: false });
      setPreview(URL.createObjectURL(blob));
      setFileName(file.name);
    } catch (e) {
      console.error("doc compress:", e);
      const heic = (DOC_HEIC_TYPES as readonly string[]).includes(file.type);
      setLocalError(
        heic
          ? "Couldn't read this HEIC image — please upload a JPG or PNG instead."
          : "Couldn't read that file — please try a JPG, PNG or PDF.",
      );
    }
  }

  function clear() {
    setFileName(null);
    setPreview(null);
    setPrepared(null);
    setUploadedKey(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>
        {label} <span className="text-primary">*</span>
      </span>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}

      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-input bg-background">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="size-full object-cover" />
          ) : prepared?.isPdf ? (
            <FileText className="size-7 text-primary" />
          ) : (
            <Upload className="size-6 text-muted-foreground/60" />
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary disabled:opacity-60"
            >
              {prepared ? "Replace" : "Choose file"}
            </button>
            {prepared && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:text-[var(--closed)]"
              >
                <X className="size-3.5" /> Remove
              </button>
            )}
          </div>
          {fileName ? (
            <span className="max-w-[12rem] truncate font-mono text-[10px] tracking-wider text-foreground/70">
              {fileName}
            </span>
          ) : (
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              {kind === "aadhaar" ? "JPG / PNG / PDF · max 5 MB" : "JPG / PNG · max 5 MB"}
            </span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr(kind)}
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
});
