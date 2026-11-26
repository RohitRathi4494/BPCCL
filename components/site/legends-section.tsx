"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { VideoModal, type ModalVideo } from "@/components/site/video-modal";
import type { LegendCard } from "@/lib/queries/legends";

/** ISO-2 → regional-indicator flag emoji (pure text; no network/CSP concerns). */
function flagEmoji(iso2: string | null): string | null {
  if (!iso2) return null;
  const cc = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  return String.fromCodePoint(
    ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

function visitPill(l: LegendCard): string | null {
  const parts = [l.visitType, l.visitMonthLabel].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function LegendsSection({
  legends,
  alsoTrained,
  removalEmail,
}: {
  legends: LegendCard[];
  alsoTrained: string[];
  removalEmail: string | null;
}) {
  const featured = legends.find((l) => l.isFeatured) ?? legends[0];
  const rest = legends.filter((l) => l.id !== featured?.id);

  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(rest.length / pageSize));
  const [page, setPage] = useState(0);
  const showArrows = rest.length > pageSize;

  const [active, setActive] = useState<ModalVideo | null>(null);
  const openVideo = (l: LegendCard) =>
    setActive({
      youtubeId: l.youtubeId!,
      format: "video",
      title: l.name,
      personName: l.name,
      personRole: l.teamOrRole,
    });

  if (!featured) return null;

  const start = (((page % pages) + pages) % pages) * pageSize;
  const gridLegends = rest.slice(start, start + pageSize);

  return (
    <section className="bg-navy-900 text-cream-100">
      <div className="mx-auto max-w-[1280px] px-5 pt-20 pb-[88px] sm:pt-24">
        {/* Header */}
        <Reveal
          as="div"
          stagger={false}
          className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="flex flex-col gap-3">
            <Eyebrow brackets="square" className="text-gold-400">
              THEY TRAINED HERE
            </Eyebrow>
            <h2 className="editorial-heading max-w-2xl text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.04]">
              Where international stars sharpen their game.
            </h2>
          </div>
          {showArrows && (
            <div className="hidden shrink-0 gap-3 md:flex">
              <ArrowButton label="Previous legends" onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-5" />
              </ArrowButton>
              <ArrowButton label="More legends" onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-5" />
              </ArrowButton>
            </div>
          )}
        </Reveal>

        {/* Body */}
        <div className="flex flex-wrap gap-6">
          {/* Featured */}
          <article className="group relative min-h-[600px] shrink grow-[999] basis-[460px] overflow-hidden rounded-[20px]">
            <LegendPhoto legend={featured} sizes="(min-width:1024px) 620px, 100vw" priority={false} />
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-gold-400 px-3 py-1 text-xs font-semibold tracking-wide text-navy-950 uppercase">
              Featured
            </span>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[#07142E] via-[#07142E]/70 to-transparent p-6 pt-24">
              <div className="flex items-center gap-2 text-[15px] text-[#C9D2E6]">
                {flagEmoji(featured.country) && (
                  <span aria-hidden className="text-lg leading-none">
                    {flagEmoji(featured.country)}
                  </span>
                )}
                {featured.teamOrRole && <span>{featured.teamOrRole}</span>}
              </div>
              <h3 className="font-display text-[clamp(2.5rem,4.6vw,4.25rem)] leading-[0.92] font-extrabold tracking-tight uppercase">
                {featured.name}
              </h3>
              {featured.quote && (
                <p className="max-w-xl text-[18px] leading-snug text-cream-100/90">
                  &ldquo;{featured.quote}&rdquo;
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {visitPill(featured) && (
                  <span className="inline-flex items-center rounded-full border border-white/25 px-3 py-1 text-xs text-cream-100/90">
                    {visitPill(featured)}
                  </span>
                )}
                {featured.youtubeId && (
                  <button
                    type="button"
                    onClick={() => openVideo(featured)}
                    className="inline-flex items-center gap-2 rounded-full bg-gold-400 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-navy-950 transition-transform hover:scale-[1.03]"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-navy-950 text-gold-400">
                      <Play className="size-3.5 translate-x-px" fill="currentColor" />
                    </span>
                    Watch feedback
                  </button>
                )}
              </div>
            </div>
          </article>

          {/* Grid of next 4 — desktop 2×2, mobile horizontal scroll-snap row */}
          {rest.length > 0 && (
            <div className="shrink grow basis-[520px]">
              {/* Desktop paged grid */}
              <ul className="hidden grid-cols-2 gap-6 md:grid">
                {gridLegends.map((l) => (
                  <li key={l.id}>
                    <GridCard legend={l} onPlay={openVideo} />
                  </li>
                ))}
              </ul>
              {/* Mobile scroll row */}
              <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {rest.map((l) => (
                  <li key={l.id} className="w-[78%] shrink-0 snap-start">
                    <GridCard legend={l} onPlay={openVideo} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer — the "See the ground" link always shows (/ballpark exists);
            "Also trained here" is hidden when there are no names. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[#22396E] pt-6 sm:flex-row sm:items-center sm:justify-between">
            {alsoTrained.length > 0 ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="font-mono text-[11px] tracking-[0.16em] text-gold-400 uppercase">
                  Also trained here
                </span>
                <span className="text-cream-100/80">{alsoTrained.join(" · ")}</span>
              </p>
            ) : (
              <span aria-hidden />
            )}
            <Link
              href="/ballpark"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-cream-100 hover:text-gold-400"
            >
              See the ground <ArrowRight className="size-4" />
            </Link>
        </div>

        {removalEmail && (
          <p className="mt-4 text-xs text-[#8C9AB8]">
            Photos taken at Ballpark. To request removal, contact{" "}
            <a href={`mailto:${removalEmail}`} className="underline hover:text-cream-100">
              {removalEmail}
            </a>
            .
          </p>
        )}
      </div>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function ArrowButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-[52px] place-items-center rounded-full border border-[#3A5287] text-cream-100 transition-colors hover:bg-gold-400 hover:text-navy-950"
    >
      {children}
    </button>
  );
}

function GridCard({
  legend,
  onPlay,
}: {
  legend: LegendCard;
  onPlay: (l: LegendCard) => void;
}) {
  return (
    <article className="group relative min-h-[288px] overflow-hidden rounded-[18px]">
      <LegendPhoto legend={legend} sizes="(min-width:768px) 300px, 78vw" priority={false} />
      {legend.youtubeId && (
        <button
          type="button"
          onClick={() => onPlay(legend)}
          aria-label={`Play video: ${legend.name}`}
          className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-gold-400 text-navy-950 shadow-lg transition-transform hover:scale-110"
        >
          <Play className="size-4 translate-x-px" fill="currentColor" />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-[#07142E] via-[#07142E]/60 to-transparent p-4 pt-16">
        {legend.teamOrRole && (
          <span className="flex items-center gap-1.5 text-[13px] text-[#C9D2E6]">
            {flagEmoji(legend.country) && (
              <span aria-hidden className="leading-none">
                {flagEmoji(legend.country)}
              </span>
            )}
            {legend.teamOrRole}
          </span>
        )}
        <h3 className="font-display text-[26px] leading-none font-extrabold uppercase">
          {legend.name}
        </h3>
        {visitPill(legend) && (
          <span className="mt-1 inline-flex w-fit items-center rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-cream-100/85">
            {visitPill(legend)}
          </span>
        )}
      </div>
    </article>
  );
}

function LegendPhoto({
  legend,
  sizes,
  priority,
}: {
  legend: LegendCard;
  sizes: string;
  priority: boolean;
}) {
  return (
    <Image
      src={legend.photo}
      alt={legend.alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
    />
  );
}
