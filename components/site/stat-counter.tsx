"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A single big number that counts up from 0 → `value` the first time it scrolls
 * into view. Respects reduced motion (shows the final value instantly).
 */
export function StatCounter({
  value,
  label,
  suffix = "",
  prefix = "",
  className,
  tone = "dark",
}: {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const dark = tone === "dark";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const r = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(r);
    }
    let raf = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const dur = 1100;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <div ref={ref} className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          "display-wordmark text-5xl sm:text-6xl",
          dark ? "text-white" : "text-navy-900",
        )}
        suppressHydrationWarning
      >
        {prefix}
        {display.toLocaleString("en-IN")}
        {suffix}
      </span>
      <span
        className={cn("eyebrow", dark ? "text-white/60" : "text-muted-ink")}
      >
        {label}
      </span>
    </div>
  );
}
