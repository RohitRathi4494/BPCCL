"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import {
  RegistrationTermsBody,
  TERMS_VERSION,
} from "@/components/site/registration-terms";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const ACCEPT_KEY = "bpccl-terms-accepted";

/**
 * Gates the registration form behind the full Terms & Conditions: a player must
 * scroll through the terms and explicitly accept them before the form is shown.
 * Acceptance (for the current TERMS_VERSION) is remembered in localStorage so a
 * page reload or draft-continue doesn't force a re-read; bumping TERMS_VERSION
 * invalidates it and forces every player to accept the new terms.
 */
export function RegistrationGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore a prior acceptance of *this* version once on mount. Deferred out of
  // the effect body so it isn't a synchronous setState-in-effect.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(ACCEPT_KEY) === TERMS_VERSION) setAccepted(true);
      } catch {}
      setHydrated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // If the terms are short enough not to scroll, treat them as already read.
  useEffect(() => {
    if (accepted || !hydrated) return;
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el && el.scrollHeight - el.clientHeight < 24) setScrolledToEnd(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [accepted, hydrated]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) {
      setScrolledToEnd(true);
    }
  }

  function accept() {
    if (!checked) return;
    try {
      localStorage.setItem(ACCEPT_KEY, TERMS_VERSION);
    } catch {}
    setAccepted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Avoid a hydration flash: render nothing decision-dependent until mounted.
  if (!hydrated) return null;
  if (accepted) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-navy-700/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-navy-700 uppercase">
          <ShieldCheck className="size-3.5" /> Step 0 · Terms
        </span>
        <h2 className="editorial-heading text-3xl text-navy-900 sm:text-4xl">
          Terms &amp; Conditions
        </h2>
        <p className="text-sm text-muted-ink">
          Please read these registration terms for {site.name} {site.season} in full.
          You must accept them before you can fill in the registration form.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white">
        <div className="border-b border-navy-900/10 bg-cream-100 px-5 py-3">
          <p className="font-display text-sm font-bold text-navy-900">
            {site.name}, {site.season}
          </p>
          <p className="text-xs text-muted-ink">Player Registration Terms and Conditions</p>
        </div>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="max-h-[60vh] overflow-y-auto px-5 py-5"
        >
          <RegistrationTermsBody />
        </div>
      </div>

      <div className="rounded-xl border border-navy-900/10 bg-white p-4">
        <label
          className={cn(
            "flex items-start gap-3 text-sm text-ink-900",
            scrolledToEnd ? "cursor-pointer" : "cursor-not-allowed opacity-55",
          )}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={!scrolledToEnd}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-navy-700"
          />
          <span>
            I have read and accept the <span className="font-semibold">Terms &amp; Conditions</span>{" "}
            above. I confirm the information I provide will be true and complete, and I
            agree to abide by the League&apos;s rules and code of conduct.
          </span>
        </label>
        {!scrolledToEnd && (
          <p className="mt-2 pl-7 text-xs text-muted-ink">
            Scroll to the end of the terms to enable this.
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-navy-900/10 pt-6">
        <button
          type="button"
          onClick={accept}
          disabled={!checked}
          className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-sm font-bold uppercase tracking-wide text-navy-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="size-4" /> Accept &amp; Continue <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
