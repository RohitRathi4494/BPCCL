"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Click-to-load Google Maps embed. Nothing from Google loads until the user
 * clicks — the iframe is injected on demand (keeps the page free of third-party
 * requests on initial load; good for performance + privacy).
 */
export function MapEmbed({ src, label }: { src: string; label?: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-navy-900/10">
        <iframe
          src={src}
          title={label ?? "Map"}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy-900/20 bg-cream-100 text-navy-700 transition-colors hover:border-gold-400"
    >
      <MapPin className="size-8 text-gold-600" />
      <span className="font-display text-base font-semibold">Load map</span>
      <span className="text-xs text-muted-ink">Click to load the Google Map</span>
    </button>
  );
}
