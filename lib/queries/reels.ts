/**
 * Public reads for the "Reels" rail (home Section B).
 * SERVER ONLY — resolves a custom poster R2 key to a URL, else falls back to
 * the YouTube thumbnail. Client components receive plain strings.
 *
 * RLS restricts anon reads to visible rows; this adds the public ordering and
 * caps the publicly rendered rail at 12 (the admin also enforces this cap, but
 * a second guard here keeps the rail bounded no matter what is in the table).
 */
import { createClient } from "@/lib/supabase/server";
import { publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import type { Reel } from "@/lib/types";

export const MAX_PUBLIC_REELS = 12;

export type ReelCard = {
  id: string;
  youtubeId: string;
  format: "short" | "video";
  title: string | null;
  personName: string;
  personRole: string | null;
  quote: string | null;
  durationLabel: string | null;
  poster: string;
};

function toCard(r: Reel): ReelCard {
  return {
    id: r.id,
    youtubeId: r.youtube_id,
    format: r.video_format === "short" ? "short" : "video",
    title: r.title,
    personName: r.person_name,
    personRole: r.person_role,
    quote: r.quote,
    durationLabel: r.duration_label,
    poster: r.custom_poster_r2_key
      ? publicObjectUrl(r.custom_poster_r2_key)
      : youtubePoster(r.youtube_id),
  };
}

/** Visible reels, by display_order then newest, capped at MAX_PUBLIC_REELS. */
export async function getVisibleReels(): Promise<ReelCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("is_visible", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_PUBLIC_REELS);
  if (error) {
    console.error("getVisibleReels:", error.message);
    return [];
  }
  return (data ?? []).map(toCard);
}
