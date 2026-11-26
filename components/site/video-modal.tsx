"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { youtubeEmbedSrc } from "@/lib/ground/youtube";

export type ModalVideo = {
  youtubeId: string;
  format: "video" | "short";
  title: string | null;
  /** Optional caption shown under the player (Legends + Reels pass these). */
  personName?: string | null;
  personRole?: string | null;
};

/**
 * Lite YouTube modal shared by Legends, Reels and the ground gallery. No YouTube
 * script or iframe exists until this mounts (i.e. until the user clicks a
 * poster); the nocookie iframe is injected here with autoplay and removed when
 * the modal unmounts, which stops audio. Shorts render 9:16 (max 300×533 on
 * mobile, 380×676 desktop), normal videos 16:9. Traps focus, restores it on
 * close, closes on Esc / backdrop click.
 */
export function VideoModal({ video, onClose }: { video: ModalVideo; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], iframe, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const isShort = video.format === "short";
  const caption = video.personName?.trim() || null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? video.title ?? "Video"}
      ref={dialogRef}
    >
      <div
        className={
          "relative flex w-full flex-col items-center " +
          (isShort ? "w-[min(92vw,300px)] sm:w-[380px]" : "max-w-4xl")
        }
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-12 right-0 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:-right-12 sm:top-0"
        >
          <X className="size-5" />
        </button>
        <div
          className="w-full overflow-hidden rounded-xl bg-black shadow-2xl"
          style={{ aspectRatio: isShort ? "9 / 16" : "16 / 9" }}
        >
          <iframe
            src={youtubeEmbedSrc(video.youtubeId)}
            title={video.title ?? "YouTube video player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        {caption && (
          <div className="mt-3 text-center">
            <p className="font-display text-sm font-semibold text-cream-100">{caption}</p>
            {video.personRole?.trim() && (
              <p className="text-xs text-cream-100/60">{video.personRole}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
