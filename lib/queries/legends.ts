/**
 * Public reads for "Legends at Ballpark" (home Section A).
 * SERVER ONLY — resolves the stored R2 portrait key to a full URL so client
 * components receive plain strings and never touch R2 env.
 *
 * RLS already restricts anon reads to visible rows; these queries add the
 * public ordering (featured first, then display_order, then newest) and shape
 * the row into a render-ready card. The display rule "a quote only shows when
 * the person said it on camera" is applied here: `quote` is dropped unless a
 * `youtube_id` is present.
 */
import { createClient } from "@/lib/supabase/server";
import { publicObjectUrl } from "@/lib/storage";
import type { Legend } from "@/lib/types";

export type LegendCard = {
  id: string;
  name: string;
  country: string | null; // ISO-2, lowercased for a flag lookup
  teamOrRole: string | null;
  visitType: string | null;
  visitMonthLabel: string | null; // "Feb 2026"
  photo: string;
  alt: string;
  youtubeId: string | null;
  quote: string | null; // only populated when youtubeId is set
  isFeatured: boolean;
};

function monthLabel(date: string | null): string | null {
  if (!date) return null;
  // visit_month is a DATE (yyyy-mm-dd); parse as UTC to avoid TZ drift.
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toCard(l: Legend): LegendCard {
  return {
    id: l.id,
    name: l.name,
    country: l.country ? l.country.toLowerCase() : null,
    teamOrRole: l.team_or_role,
    visitType: l.visit_type,
    visitMonthLabel: monthLabel(l.visit_month),
    photo: publicObjectUrl(l.r2_key),
    alt: l.alt_text,
    youtubeId: l.youtube_id,
    quote: l.youtube_id ? l.quote : null,
    isFeatured: l.is_featured,
  };
}

/** Visible legends, featured first then display_order then newest. */
export async function getVisibleLegends(): Promise<LegendCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legends")
    .select("*")
    .eq("is_visible", true)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getVisibleLegends:", error.message);
    return [];
  }
  return (data ?? []).map(toCard);
}
