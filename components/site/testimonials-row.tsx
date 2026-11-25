"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { VideoModal, type ModalVideo } from "@/components/site/video-modal";
import type { GroundVideoCard } from "@/lib/queries/ground";

/**
 * "Heard on the ground" — horizontal scroll-snap row of testimonial videos.
 * Each card is a button (poster + play) that opens the lite modal; no YouTube
 * script loads until a click. Arrows scroll on desktop; native scroll/swipe on
 * mobile. Reduced motion is respected (smooth scroll is a progressive nicety).
 */
export function TestimonialsRow({
  videos,
  channelUrl,
  seeAllHref,
}: {
  videos: GroundVideoCard[];
  channelUrl?: string | null;
  seeAllHref?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ModalVideo | null>(null);

  function scrollBy(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 360), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="mb-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="hidden size-10 place-items-center rounded-full border border-white/25 text-white transition-colors hover:border-gold-400 hover:text-gold-400 sm:grid"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="hidden size-10 place-items-center rounded-full border border-white/25 text-white transition-colors hover:border-gold-400 hover:text-gold-400 sm:grid"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActive({ youtubeId: v.youtubeId, format: v.format, title: v.title })}
            aria-label={`Play video: ${v.personName ?? v.title ?? "testimonial"}`}
            className="group relative w-[78vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-navy-900 text-left"
          >
            <div
              className="relative w-full"
              style={{ aspectRatio: v.format === "short" ? "9 / 16" : "16 / 10" }}
            >
              <Image
                src={v.poster}
                alt=""
                fill
                sizes="300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/10 to-transparent" />
              <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-400 text-navy-950 shadow-lg transition-transform group-hover:scale-110">
                <Play className="size-6 translate-x-0.5" fill="currentColor" />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4">
              {v.quote && (
                <p className="mb-2 line-clamp-3 text-sm leading-snug text-white/90">
                  &ldquo;{v.quote}&rdquo;
                </p>
              )}
              {v.personName && (
                <p className="font-display text-sm font-semibold text-white">{v.personName}</p>
              )}
              {v.personRole && <p className="text-xs text-white/60">{v.personRole}</p>}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        {seeAllHref && (
          <a
            href={seeAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-gold-400"
          >
            See all videos <ArrowUpRight className="size-4" />
          </a>
        )}
        {channelUrl && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-gold-400"
          >
            Watch more on our YouTube channel <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </div>
  );
}
