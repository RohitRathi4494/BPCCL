"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Unit = { label: string; value: number };

function diff(target: number): Unit[] {
  const now = Date.now();
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hrs = Math.floor(s / 3600);
  s -= hrs * 3600;
  const mins = Math.floor(s / 60);
  s -= mins * 60;
  return [
    { label: "Days", value: days },
    { label: "Hrs", value: hrs },
    { label: "Min", value: mins },
    { label: "Sec", value: s },
  ];
}

function Cell({ unit }: { unit: Unit }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="segment-cell grid h-16 w-14 place-items-center rounded-md sm:h-20 sm:w-16">
        <span className="segment-digit font-mono text-3xl font-bold sm:text-4xl">
          {String(unit.value).padStart(2, "0")}
        </span>
      </div>
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {unit.label}
      </span>
    </div>
  );
}

/**
 * Scoreboard countdown. Pass an ISO date string as `target`; when null it shows
 * a "To be announced" state. Dates are not wired to the DB yet — see the home
 * page TODO. Time is computed client-side only (post-mount) to avoid hydration
 * mismatch.
 */
export function Countdown({
  target,
  title,
  className,
}: {
  target: string | null;
  title: string;
  className?: string;
}) {
  const [units, setUnits] = useState<Unit[] | null>(null);

  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) return;
    // Render falls back to a freshly-computed value while `units` is null, so
    // the interval alone drives updates (no direct setState in the effect body).
    const id = setInterval(() => setUnits(diff(t)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const tba = !target || Number.isNaN(new Date(target).getTime());

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <span className="font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
        {title}
      </span>
      {tba ? (
        <div className="segment-cell inline-flex items-center gap-3 self-start rounded-md px-5 py-4">
          <span
            className="size-2 animate-pulse rounded-full bg-[var(--lime)]"
            aria-hidden
          />
          <span className="font-mono text-sm tracking-[0.18em] text-[var(--cream)] uppercase">
            To be announced
          </span>
        </div>
      ) : (
        <div className="flex gap-3" suppressHydrationWarning>
          {(units ?? diff(new Date(target).getTime())).map((u) => (
            <Cell key={u.label} unit={u} />
          ))}
        </div>
      )}
    </div>
  );
}
