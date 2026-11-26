"use client";

import { cn } from "@/lib/utils";

export type SliderImage = { src: string; alt: string };

/**
 * ImageAutoSlider — an infinite, auto-scrolling horizontal image marquee.
 *
 * Adapted from the 21st.dev "image-auto-slider" into a reusable, production
 * component: it takes real images as a prop (no hard-coded CDN URLs), drops the
 * original full-screen black wrapper and the global `html, body` override (which
 * would hijack the whole page), and keeps its keyframes scoped to prefixed class
 * names so it's safe to drop anywhere. Edges fade via a CSS mask; the strip
 * pauses on hover so a photo can be read.
 */
export function ImageAutoSlider({
  images,
  speedSeconds = 40,
  className,
}: {
  images: SliderImage[];
  /** Time for one full loop. Lower = faster. */
  speedSeconds?: number;
  className?: string;
}) {
  if (images.length === 0) return null;
  // Duplicate once for a seamless -50% loop.
  const loop = [...images, ...images];

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <style>{`
        @keyframes ias-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ias-mask {
          -webkit-mask: linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%);
          mask: linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%);
        }
        .ias-track {
          animation: ias-scroll linear infinite;
          will-change: transform;
        }
        .ias-track:hover { animation-play-state: paused; }
        .ias-item { transition: transform 0.3s ease, filter 0.3s ease; }
        .ias-item:hover { transform: scale(1.04); filter: brightness(1.06); }
        @media (prefers-reduced-motion: reduce) {
          .ias-track { animation: none; }
        }
      `}</style>

      <div className="ias-mask w-full">
        <div
          className="ias-track flex w-max gap-6"
          style={{ animationDuration: `${speedSeconds}s` }}
        >
          {loop.map((image, index) => (
            <div
              key={index}
              className="ias-item h-48 w-48 shrink-0 overflow-hidden rounded-xl shadow-xl md:h-64 md:w-64 lg:h-72 lg:w-72"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={index < images.length ? image.alt : ""}
                aria-hidden={index >= images.length}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
