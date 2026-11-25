/**
 * YouTube helpers — id extraction (pure), poster URLs (pure), and the free
 * oEmbed title/availability check (server-only; no API key).
 *
 * We never load the YouTube IFrame API or Data API. Videos are hand-picked by
 * an admin; we only store the 11-char id and embed a lite nocookie iframe on
 * click. oEmbed is used once at save time to fetch the title and to prove the
 * video is public + embeddable (a private/deleted/blocked video fails oEmbed).
 */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract the 11-char video id from any YouTube link shape — watch?v=,
 * youtu.be/, /shorts/, /embed/, /live/, with any extra query params — or from a
 * bare id. Returns null when no valid id is present.
 */
export function extractYouTubeId(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return ID_RE.test(parts[0] ?? "") ? parts[0] : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;
    // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
    const keyed = ["shorts", "embed", "live", "v"];
    const idx = parts.findIndex((p) => keyed.includes(p));
    if (idx !== -1 && ID_RE.test(parts[idx + 1] ?? "")) return parts[idx + 1];
  }

  return null;
}

/** True when the original link was a Short (/shorts/…). */
export function isShortsLink(input: string): boolean {
  return /\/shorts\//i.test(input ?? "");
}

/** Poster image from i.ytimg.com. `hq` ≈ 480×360 (always exists). */
export function youtubePoster(id: string, quality: "hq" | "maxres" = "hq"): string {
  const name = quality === "maxres" ? "maxresdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${id}/${name}.jpg`;
}

/** nocookie embed URL with autoplay — injected only on click, never on load. */
export function youtubeEmbedSrc(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export type OEmbedResult =
  | { ok: true; title: string; authorName: string | null }
  | { ok: false; reason: string };

/**
 * Call YouTube's free oEmbed endpoint (server-side, no key). A successful
 * response proves the video is public and embeddable; any failure means it is
 * private, deleted, age-restricted or embedding-disabled — so it must be
 * blocked from being saved / shown.
 */
export async function fetchYouTubeOEmbed(id: string): Promise<OEmbedResult> {
  if (!ID_RE.test(id)) return { ok: false, reason: "That isn't a valid YouTube link." };
  const endpoint =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  try {
    const res = await fetch(endpoint, {
      // Title can change; cache briefly but don't pin forever.
      next: { revalidate: 3600 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return {
        ok: false,
        reason:
          "This video can't be embedded — it may be private, deleted, age-restricted or have embedding turned off.",
      };
    }
    const data = (await res.json()) as { title?: string; author_name?: string };
    return {
      ok: true,
      title: data.title?.trim() || "Untitled video",
      authorName: data.author_name?.trim() || null,
    };
  } catch {
    return { ok: false, reason: "Couldn't reach YouTube to verify the video. Try again." };
  }
}
