/**
 * Public reads for the Ground & Trust content (home sections + /ballpark).
 * SERVER ONLY — resolves stored R2 keys to full URLs via the storage layer so
 * client components receive plain strings and never touch R2 env.
 *
 * RLS already restricts anon/authenticated reads to visible rows; these queries
 * add the public ordering (featured first, then display_order).
 */
import { createClient } from "@/lib/supabase/server";
import { publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import type { Client, Faq, GroundFact, GroundMedia } from "@/lib/types";

export type GroundPhoto = {
  id: string;
  title: string | null;
  caption: string | null;
  alt: string;
  src: string;
  isFeatured: boolean;
};

export type GroundVideoCard = {
  id: string;
  youtubeId: string;
  format: "video" | "short";
  title: string | null;
  personName: string | null;
  personRole: string | null;
  quote: string | null;
  poster: string;
  isFeatured: boolean;
};

export type ClientLogo = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
};

function orderMedia(a: GroundMedia, b: GroundMedia): number {
  if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return a.created_at.localeCompare(b.created_at);
}

async function fetchMedia(kind: "photo" | "video"): Promise<GroundMedia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ground_media")
    .select("*")
    .eq("kind", kind)
    .eq("is_visible", true);
  if (error) {
    console.error("fetchMedia:", error.message);
    return [];
  }
  return (data ?? []).sort(orderMedia);
}

function toPhoto(m: GroundMedia): GroundPhoto | null {
  if (!m.r2_key) return null;
  return {
    id: m.id,
    title: m.title,
    caption: m.caption,
    alt: m.alt_text ?? m.caption ?? m.title ?? "Ground photo",
    src: publicObjectUrl(m.r2_key),
    isFeatured: m.is_featured,
  };
}

function toVideo(m: GroundMedia): GroundVideoCard | null {
  if (!m.youtube_id) return null;
  return {
    id: m.id,
    youtubeId: m.youtube_id,
    format: m.video_format === "short" ? "short" : "video",
    title: m.title,
    personName: m.person_name,
    personRole: m.person_role,
    quote: m.quote,
    poster: m.r2_key ? publicObjectUrl(m.r2_key) : youtubePoster(m.youtube_id),
    isFeatured: m.is_featured,
  };
}

/** Visible photos in the given section (default 'ground'). */
export async function getGroundPhotos(
  section: "ground" | "testimonial" = "ground",
): Promise<GroundPhoto[]> {
  const rows = await fetchMedia("photo");
  return rows.filter((m) => m.section === section).map(toPhoto).filter((p): p is GroundPhoto => p !== null);
}

/** Visible videos in a section. Testimonials are capped at 10 publicly. */
export async function getGroundVideos(
  section: "testimonial" | "ground",
  limit?: number,
): Promise<GroundVideoCard[]> {
  const rows = await fetchMedia("video");
  const cards = rows.filter((m) => m.section === section).map(toVideo).filter((v): v is GroundVideoCard => v !== null);
  return typeof limit === "number" ? cards.slice(0, limit) : cards;
}

/** Visible ground facts (icon + value + label chips), ordered. */
export async function getGroundFacts(): Promise<GroundFact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ground_facts")
    .select("*")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("getGroundFacts:", error.message);
    return [];
  }
  return data ?? [];
}

/** Visible client logos, ordered. */
export async function getClients(): Promise<ClientLogo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("getClients:", error.message);
    return [];
  }
  return (data ?? []).map((c: Client) => ({
    id: c.id,
    name: c.name,
    logoUrl: c.logo_r2_key ? publicObjectUrl(c.logo_r2_key) : null,
    websiteUrl: c.website_url,
  }));
}

/** Visible FAQs, ordered (token substitution happens in the view layer). */
export async function getVisibleFaqs(): Promise<Faq[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("getVisibleFaqs:", error.message);
    return [];
  }
  return data ?? [];
}
