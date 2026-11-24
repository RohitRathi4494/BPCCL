import Link from "next/link";
import { cn } from "@/lib/utils";

/* =============================================================================
   BallGlyph — simple cricket-ball mark (circle + seam). Used as the accent icon
   in marquees, eyebrows and the footer © spot.
   ========================================================================== */
export function BallGlyph({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block size-[1em]", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path
        d="M8.2 3.6C9.5 7 9.8 9.8 9 12c-.8 2.2-2.4 4.4-5 6.4M15.8 3.6C14.5 7 14.2 9.8 15 12c.8 2.2 2.4 4.4 5 6.4"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M9 9.2c2 .7 4 .7 6 0M9 14.8c2-.7 4-.7 6 0"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =============================================================================
   Eyebrow — tiny tracked, bracketed label. "( LIKE THIS )" or "[ LIKE THIS ]".
   ========================================================================== */
export function Eyebrow({
  children,
  brackets = "round",
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  brackets?: "round" | "square" | "none";
  /** "script" renders the kicker in a premium flowing cursive (no brackets). */
  variant?: "default" | "script";
  className?: string;
}) {
  if (variant === "script") {
    return (
      <span className={cn("eyebrow-script inline-block", className)}>{children}</span>
    );
  }
  const [open, close] =
    brackets === "round" ? ["(", ")"] : brackets === "square" ? ["[", "]"] : ["", ""];
  return (
    <span className={cn("eyebrow inline-flex items-center gap-1.5", className)}>
      {open && <span aria-hidden>{open}</span>}
      <span>{children}</span>
      {close && <span aria-hidden>{close}</span>}
    </span>
  );
}

/* =============================================================================
   DisplayWordmark — giant grotesk wordmark.
   ========================================================================== */
export function DisplayWordmark({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("display-wordmark block", className)}>{children}</span>;
}

/* =============================================================================
   Chip — thin-outline pill.
   ========================================================================== */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* =============================================================================
   GlassCaption — frosted caption bar for photos.
   ========================================================================== */
export function GlassCaption({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-xl px-4 py-3 text-white", className)}>
      {children}
    </div>
  );
}

/* =============================================================================
   AvatarStack — overlapping decorative circles + a "{count}+" badge.
   ========================================================================== */
export function AvatarStack({
  count,
  label,
  className,
}: {
  count: number;
  label?: string;
  className?: string;
}) {
  const colors = [
    "var(--navy-700)",
    "var(--gold-400)",
    "var(--gold-600)",
    "var(--navy-900)",
  ];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex -space-x-2.5" aria-hidden>
        {colors.map((c, i) => (
          <span
            key={i}
            className="size-8 rounded-full border-2 border-white"
            style={{ background: c }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-ink-900">
        <span className="font-semibold">{count}+</span>
        {label ? ` ${label}` : ""}
      </span>
    </div>
  );
}

/* =============================================================================
   RollButton — pill CTA whose label rolls vertically on hover (two copies).
   Renders a Link when `href` is set, else a <button>.
   ========================================================================== */
type RollVariant = "gold" | "navy" | "outline" | "outline-dark";

const rollVariants: Record<RollVariant, string> = {
  gold: "bg-gold-400 text-navy-950 hover:bg-gold-400",
  navy: "bg-navy-900 text-white hover:bg-navy-900",
  outline: "border border-navy-900/20 text-navy-900 hover:border-navy-900/40",
  "outline-dark": "border border-white/25 text-white hover:border-white/50",
};

export function RollButton({
  children,
  href,
  type = "button",
  variant = "gold",
  className,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  variant?: RollVariant;
  className?: string;
  onClick?: () => void;
} & Record<string, unknown>) {
  const cls = cn(
    "roll-btn group inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors",
    rollVariants[variant],
    className,
  );
  const inner = (
    <span className="roll-clip">
      <span className="roll-track">
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} {...rest}>
      {inner}
    </button>
  );
}

/* =============================================================================
   Marquee — seamless infinite horizontal loop (pauses on hover; reduced-motion
   falls back to a static wrap). Duplicates `children` for the loop.
   ========================================================================== */
export function Marquee({
  children,
  className,
  durationSeconds = 40,
}: {
  children: React.ReactNode;
  className?: string;
  durationSeconds?: number;
}) {
  return (
    <div className={cn("marquee-group marquee-mask overflow-hidden", className)}>
      <div
        className="marquee-track"
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
      >
        <span className="inline-flex items-center">{children}</span>
        <span className="inline-flex items-center" data-marquee-dupe aria-hidden>
          {children}
        </span>
      </div>
    </div>
  );
}

/* =============================================================================
   DateTile — "Mon / 20" calendar tile.
   ========================================================================== */
export function DateTile({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const d = typeof date === "string" ? new Date(date) : date;
  const wd = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" });
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-navy-900/15 bg-cream-100 px-3 py-2 text-center",
        className,
      )}
    >
      <span className="eyebrow text-muted-ink">{wd}</span>
      <span className="font-display text-2xl font-extrabold leading-none text-navy-900">
        {day}
      </span>
    </div>
  );
}
