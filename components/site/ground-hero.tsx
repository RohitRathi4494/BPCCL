"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-bleed muted looping hero video that falls back to its poster on
 * reduced-motion, Save-Data, a missing source, or a video error. The <video>
 * is only mounted when motion is allowed, so Save-Data / reduced-motion users
 * never download it.
 */
export function GroundHero({
  videoUrl,
  posterUrl,
  children,
}: {
  videoUrl: string | null;
  posterUrl: string | null;
  children: React.ReactNode;
}) {
  const [useVideo, setUseVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoUrl) return;
    // Defer to the next frame so this isn't a synchronous setState in the effect
    // body (mirrors StatCounter). Capability checks can't run during SSR.
    const id = requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      const saveData = nav.connection?.saveData === true;
      if (!reduce && !saveData) setUseVideo(true);
    });
    return () => cancelAnimationFrame(id);
  }, [videoUrl]);

  return (
    <section className="relative h-svh min-h-[560px] w-full overflow-hidden bg-navy-950">
      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {useVideo && videoUrl && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={posterUrl ?? undefined}
          onError={() => setUseVideo(false)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-navy-950/20" />
      <div className="relative z-10 flex h-full flex-col justify-end">{children}</div>
    </section>
  );
}
