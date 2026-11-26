"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Clock, ArrowUpRight } from "lucide-react";
import { Eyebrow } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { VideoModal, type ModalVideo } from "@/components/site/video-modal";
import type { ReelCard } from "@/lib/queries/reels";

const CARD_W = 248;
const GAP = 20;

export function ReelsSection({
  reels,
  channelUrl,
}: {
  reels: ReelCard[];
  channelUrl: string | null;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState<ModalVideo | null>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => setCanScroll(el.scrollWidth - el.clientWidth > 4);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reels.length]);

  const scrollByCards = useCallback((dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * (CARD_W + GAP) * 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  function onRailKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByCards(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByCards(-1);
    }
  }

  return (
    <section className="bg-navy-950 text-white">
      <div className="pt-20 pb-[88px] sm:pt-24">
        {/* Header */}
        <Reveal
          as="div"
          stagger={false}
          className="mx-auto mb-10 flex max-w-6xl flex-col gap-5 px-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-3">
            <Eyebrow variant="script" className="text-gold-400">
              Reels from the ground
            </Eyebrow>
            <h2 className="editorial-heading max-w-2xl text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[1.04] text-white">
              Hear it from the people who play here.
            </h2>
            <p className="max-w-xl text-[17px] text-white/70">
              Cricketers and personalities on what makes Ballpark different. Tap a reel to
              watch.
            </p>
          </div>
          {canScroll && (
            <div className="hidden shrink-0 gap-3 md:flex">
              <ReelArrow label="Previous reels" onClick={() => scrollByCards(-1)}>
                <ChevronLeft className="size-5" />
              </ReelArrow>
              <ReelArrow label="More reels" onClick={() => scrollByCards(1)}>
                <ChevronRight className="size-5" />
              </ReelArrow>
            </div>
          )}
        </Reveal>

        {/* Rail — aligned to the standard max-w-6xl container, scrolls within it */}
        <div className="mx-auto max-w-6xl px-5">
          <ul
            ref={railRef}
            tabIndex={0}
            aria-label="Reels — use the left and right arrow keys to scroll"
            onKeyDown={onRailKey}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 focus-visible:outline-2 focus-visible:outline-gold-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reels.map((r) => (
              <li key={r.id} className="shrink-0 snap-start">
                <ReelButton reel={r} onPlay={setActive} />
              </li>
            ))}
          </ul>
        </div>

        {/* Below the rail */}
        <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5">
          {canScroll ? (
            <span className="text-sm text-white/70 md:hidden">
              ↔ Swipe or use the arrows to see more
            </span>
          ) : (
            <span aria-hidden />
          )}
          {channelUrl && (
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-gold-400"
            >
              Watch more on our YouTube channel <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>
      </div>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function ReelArrow({
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
      className="grid size-[52px] place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white hover:text-navy-900"
    >
      {children}
    </button>
  );
}

function ReelButton({
  reel,
  onPlay,
}: {
  reel: ReelCard;
  onPlay: (v: ModalVideo) => void;
}) {
  const label = reel.personRole
    ? `Play video: ${reel.personName}, ${reel.personRole}`
    : `Play video: ${reel.personName}`;
  return (
    <button
      type="button"
      onClick={() =>
        onPlay({
          youtubeId: reel.youtubeId,
          format: reel.format,
          title: reel.title ?? reel.personName,
          personName: reel.personName,
          personRole: reel.personRole,
        })
      }
      aria-label={label}
      className="group relative block h-[441px] w-[248px] overflow-hidden rounded-[18px] bg-navy-900 text-left ring-1 ring-white/10"
    >
      <Image
        src={reel.poster}
        alt=""
        fill
        sizes="248px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      {reel.durationLabel && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Clock className="size-3" /> {reel.durationLabel}
        </span>
      )}
      <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-400 text-navy-950 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-[1.08]">
        <Play className="size-7 translate-x-0.5" fill="currentColor" />
      </span>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-navy-950/95 via-navy-950/40 to-transparent p-4 pt-14">
        {reel.quote && (
          <p className="line-clamp-3 text-[14px] leading-snug text-cream-100/90">
            &ldquo;{reel.quote}&rdquo;
          </p>
        )}
        <p className="font-display text-[18px] leading-tight font-extrabold text-white uppercase">
          {reel.personName}
        </p>
        {reel.personRole && <p className="text-[12px] text-[#A9B3C9]">{reel.personRole}</p>}
      </div>
    </button>
  );
}
