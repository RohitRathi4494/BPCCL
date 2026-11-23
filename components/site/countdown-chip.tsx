"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Compact live "closes in 12d 4h 30m" chip. Hidden once the target passes. */
export function CountdownChip({
  target,
  label,
  className,
}: {
  target: string | null;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return;
    const compute = (): string | null => {
      let s = Math.floor((t - Date.now()) / 1000);
      if (s <= 0) return null;
      const d = Math.floor(s / 86400);
      s -= d * 86400;
      const h = Math.floor(s / 3600);
      s -= h * 3600;
      const m = Math.floor(s / 60);
      return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
    };
    // Defer the first update out of the effect body (avoids a synchronous
    // setState-in-effect) then refresh on an interval.
    const raf = requestAnimationFrame(() => setText(compute()));
    const id = setInterval(() => setText(compute()), 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [target]);

  if (!text) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur",
        className,
      )}
      suppressHydrationWarning
    >
      <span className="size-1.5 animate-pulse rounded-full bg-gold-400" aria-hidden />
      {label} <span className="font-semibold text-gold-400">{text}</span>
    </span>
  );
}
