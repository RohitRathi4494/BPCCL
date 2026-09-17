"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Megaphone } from "lucide-react";

const BANNER_KEY = "uscl-reg-extended-oct20-v1";

/**
 * Announcement banner — registration deadline extended to 20 October 2026.
 * Dismissible; stores state in sessionStorage so it re-appears on a new tab
 * but not within the same browsing session.
 */
export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(BANNER_KEY) === "1";
  });

  if (dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(BANNER_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative z-40 flex items-center justify-center gap-3 bg-[var(--lime)] px-4 py-2.5 text-[var(--navy)]"
    >
      {/* Pulse dot */}
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--navy)] opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--navy)]" />
      </span>

      <Megaphone className="size-4 shrink-0" aria-hidden />

      <p className="text-center font-heading text-xs font-bold tracking-wide uppercase sm:text-sm">
        🎉 Registration Extended!{" "}
        <span className="font-normal">
          Last date to register is now{" "}
          <strong className="font-extrabold">20 October 2026</strong>.
        </span>{" "}
        <Link
          href="/register"
          className="ml-1 underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Register Now →
        </Link>
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="ml-auto shrink-0 rounded-sm p-1 transition-colors hover:bg-[var(--navy)]/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
