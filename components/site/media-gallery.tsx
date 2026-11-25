"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { GlassCaption } from "@/components/site/primitives";
import { VideoModal, type ModalVideo } from "@/components/site/video-modal";
import type { GroundPhoto, GroundVideoCard } from "@/lib/queries/ground";

/* ---------------------------------------------------------------------------
   Lightbox — keyboard arrows, swipe, Esc, focus restore.
   ------------------------------------------------------------------------ */
function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: GroundPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const photo = photos[index];

  const go = useCallback(
    (dir: 1 | -1) => onIndex((index + dir + photos.length) % photos.length),
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [go, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
      <figure className="flex max-h-full max-w-5xl flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          className="max-h-[80vh] w-auto rounded-lg object-contain"
        />
        {(photo.caption || photo.title) && (
          <figcaption className="text-center text-sm text-white/80">
            {photo.caption ?? photo.title}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   MediaGallery — "feature" (home: 1 tall + 2×2) or "masonry" (/ballpark).
   ------------------------------------------------------------------------ */
export function MediaGallery({
  photos,
  videos = [],
  layout,
}: {
  photos: GroundPhoto[];
  videos?: GroundVideoCard[];
  layout: "feature" | "masonry";
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<ModalVideo | null>(null);

  const openVideo = (v: GroundVideoCard) =>
    setActiveVideo({ youtubeId: v.youtubeId, format: v.format, title: v.title });

  if (layout === "feature") {
    const featured = photos.find((p) => p.isFeatured) ?? photos[0];
    const rest = photos.filter((p) => p.id !== featured?.id).slice(0, 4);
    if (!featured) return null;
    return (
      <>
        <div className="grid gap-4 md:grid-cols-3">
          <GalleryTile
            photo={featured}
            onOpen={() => setLightboxIndex(photos.indexOf(featured))}
            className="min-h-[20rem] md:row-span-2"
          />
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            {rest.map((p) => (
              <GalleryTile
                key={p.id}
                photo={p}
                onOpen={() => setLightboxIndex(photos.indexOf(p))}
                className="min-h-[9.5rem]"
              />
            ))}
          </div>
        </div>
        {lightboxIndex !== null && (
          <Lightbox photos={photos} index={lightboxIndex} onIndex={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </>
    );
  }

  // masonry — mixed photos + ground videos
  return (
    <>
      <div className="columns-2 gap-4 [column-fill:_balance] sm:columns-3 lg:columns-4">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightboxIndex(photos.indexOf(p))}
            className="group mb-4 block w-full overflow-hidden rounded-xl border border-navy-900/10"
            aria-label={`View photo: ${p.alt}`}
          >
            <Image
              src={p.src}
              alt={p.alt}
              width={800}
              height={600}
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => openVideo(v)}
            aria-label={`Play video: ${v.title ?? "ground clip"}`}
            className="group relative mb-4 block w-full overflow-hidden rounded-xl border border-navy-900/10"
          >
            <Image
              src={v.poster}
              alt=""
              width={800}
              height={v.format === "short" ? 1200 : 450}
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              className="h-auto w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-navy-950/20">
              <span className="grid size-12 place-items-center rounded-full bg-gold-400 text-navy-950">
                <Play className="size-5 translate-x-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox photos={photos} index={lightboxIndex} onIndex={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
    </>
  );
}

function GalleryTile({
  photo,
  onOpen,
  className,
}: {
  photo: GroundPhoto;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View photo: ${photo.alt}`}
      className={`group relative flex items-end overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-900 text-left ${className ?? ""}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width:768px) 40vw, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {(photo.caption || photo.title) && (
        <GlassCaption className="relative z-10 m-3 flex-1">
          <p className="font-display text-sm font-semibold">{photo.caption ?? photo.title}</p>
        </GlassCaption>
      )}
    </button>
  );
}
