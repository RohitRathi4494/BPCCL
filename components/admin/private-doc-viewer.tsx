"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { viewPrivateDoc } from "@/app/admin/(protected)/registrations/actions";
import type { DocKind } from "@/lib/storage/docs";

/**
 * Opens a private document (Aadhaar / payment screenshot) via a SHORT-LIVED
 * presigned URL fetched on click. The URL is never put in page HTML. We open a
 * blank tab synchronously on the click (so it isn't popup-blocked), then point
 * it at the signed URL once it resolves.
 */
export function PrivateDocViewer({
  playerId,
  kind,
  label,
}: {
  playerId: string;
  kind: DocKind;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setBusy(true);
    const tab = window.open("", "_blank", "noopener,noreferrer");
    try {
      const res = await viewPrivateDoc(playerId, kind);
      if (res.url) {
        if (tab) tab.location.href = res.url;
        else window.location.href = res.url; // popup blocked — navigate here
      } else {
        tab?.close();
        setError(res.error ?? "Could not open the document.");
      }
    } catch {
      tab?.close();
      setError("Could not open the document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ExternalLink className="size-3.5" />
        )}
        {label}
      </button>
      {error && <span className="text-xs text-[var(--closed)]">{error}</span>}
    </div>
  );
}
