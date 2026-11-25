/**
 * Contact-link helpers (pure). WhatsApp values may be stored as a full wa.me /
 * api.whatsapp.com URL or as a bare phone number; both normalise to a tappable
 * link, optionally with a prefilled message.
 */

export function whatsappLink(value: string | null | undefined, text?: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const encoded = text ? encodeURIComponent(text) : "";
  if (/^https?:\/\//i.test(raw)) {
    const sep = raw.includes("?") ? "&" : "?";
    return text ? `${raw}${sep}text=${encoded}` : raw;
  }
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encoded}` : ""}`;
}

export function telLink(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return `tel:${raw.replace(/\s/g, "")}`;
}

/** A Google Maps *embed* URL that needs no API key (query by coords or address). */
export function mapsEmbedSrc(opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string | null {
  if (typeof opts.lat === "number" && typeof opts.lng === "number") {
    return `https://www.google.com/maps?q=${opts.lat},${opts.lng}&z=15&output=embed`;
  }
  const addr = (opts.address ?? "").trim();
  if (addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`;
  return null;
}
