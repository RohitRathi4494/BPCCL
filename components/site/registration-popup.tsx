"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

const DISMISS_KEY = "uscl-reg-popup-dismissed";

/**
 * Promotional "Registration is Open" pop-up for the home page. Appears a moment
 * after load with a pop-in animation and a glowing, pulsing Register CTA.
 * Dismissible (X / backdrop / Esc) and remembered for the session so it doesn't
 * nag on every navigation.
 */
export function RegistrationPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sessionStorage may be unavailable — dismiss for this view anyway */
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-popup-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="popup-backdrop absolute inset-0 bg-[var(--navy)]/70 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="popup-card lamp-glow relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-primary uppercase">
          <Sparkles className="size-3.5" />
          Registration Open
        </span>

        <h2
          id="reg-popup-title"
          className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-foreground uppercase sm:text-4xl"
        >
          Enter the Pool
        </h2>

        <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
          Player registration for Season 2 is live. No account needed — a quick
          public form. Open to players aged 30 and above.
        </p>

        <Link
          href="/register"
          onClick={close}
          className="cta-glow mt-7 inline-flex w-full items-center justify-center rounded-sm bg-primary px-6 py-3.5 font-heading text-base font-bold tracking-wide text-primary-foreground uppercase transition-transform hover:scale-[1.02]"
        >
          Register Now
        </Link>

        <button
          type="button"
          onClick={close}
          className="mt-4 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
