import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicStorageConfigured, publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import {
  GroundManager,
  type PhotoView,
  type VideoView,
  type ClientView,
  type FactView,
  type FaqView,
  type GroundInfo,
} from "@/components/admin/ground/ground-manager";
import type { Client, Faq, GroundFact, GroundMedia, LeagueSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminGroundPage() {
  await requireAdmin();
  const r2 = publicStorageConfigured();
  const urlFor = (key: string | null): string | null =>
    key && r2 ? publicObjectUrl(key) : null;

  const supabase = await createClient();
  const [mediaRes, clientsRes, factsRes, faqsRes, settingsRes] = await Promise.all([
    supabase.from("ground_media").select("*").order("display_order", { ascending: true }),
    supabase.from("clients").select("*").order("display_order", { ascending: true }),
    supabase.from("ground_facts").select("*").order("display_order", { ascending: true }),
    supabase.from("faqs").select("*").order("display_order", { ascending: true }),
    supabase.from("league_settings").select("*").limit(1).maybeSingle(),
  ]);

  const media = (mediaRes.data ?? []) as GroundMedia[];
  const section = (s: string): "ground" | "testimonial" =>
    s === "testimonial" ? "testimonial" : "ground";

  const photos: PhotoView[] = media
    .filter((m) => m.kind === "photo")
    .map((m) => ({
      id: m.id,
      section: section(m.section),
      title: m.title,
      caption: m.caption,
      alt: m.alt_text,
      url: urlFor(m.r2_key) ?? "",
      isFeatured: m.is_featured,
      isVisible: m.is_visible,
      consent: m.consent_confirmed,
    }));

  const videos: VideoView[] = media
    .filter((m) => m.kind === "video" && m.youtube_id)
    .map((m) => ({
      id: m.id,
      section: section(m.section),
      youtubeId: m.youtube_id!,
      format: m.video_format === "short" ? "short" : "video",
      title: m.title,
      personName: m.person_name,
      personRole: m.person_role,
      quote: m.quote,
      poster: urlFor(m.r2_key) ?? youtubePoster(m.youtube_id!),
      isFeatured: m.is_featured,
      isVisible: m.is_visible,
      consent: m.consent_confirmed,
    }));

  const clients: ClientView[] = ((clientsRes.data ?? []) as Client[]).map((c) => ({
    id: c.id,
    name: c.name,
    logoUrl: urlFor(c.logo_r2_key),
    website: c.website_url,
    category: c.category,
    isVisible: c.is_visible,
    permission: c.permission_confirmed,
  }));

  const facts: FactView[] = ((factsRes.data ?? []) as GroundFact[]).map((f) => ({
    id: f.id,
    label: f.label,
    value: f.value,
    icon: f.icon,
    isVisible: f.is_visible,
  }));

  const faqs: FaqView[] = ((faqsRes.data ?? []) as Faq[]).map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    isVisible: f.is_visible,
  }));

  const s = settingsRes.data as LeagueSettings | null;
  const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
  const info: GroundInfo = {
    ground_name: str(s?.ground_name),
    ground_tagline: str(s?.ground_tagline),
    ground_address: str(s?.ground_address),
    ground_map_url: str(s?.ground_map_url),
    ground_lat: str(s?.ground_lat),
    ground_lng: str(s?.ground_lng),
    ground_whatsapp: str(s?.ground_whatsapp),
    youtube_channel_url: str(s?.youtube_channel_url),
    stat_clients: str(s?.stat_clients),
    stat_years: str(s?.stat_years),
    stat_matches_hosted: str(s?.stat_matches_hosted),
    min_age: str(s?.min_age),
    senior_age: str(s?.senior_age),
    heroVideoUrl: urlFor(s?.hero_video_r2_key ?? null),
    heroPosterUrl: urlFor(s?.hero_poster_r2_key ?? null),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Ground &amp; Trust</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos, hand-picked testimonial videos, client logos, ground facts, FAQ and the
          /ballpark page content. Nothing shows publicly until it&apos;s marked visible (and
          consent / permission is confirmed).
        </p>
      </div>
      <GroundManager
        photos={photos}
        videos={videos}
        clients={clients}
        facts={facts}
        faqs={faqs}
        info={info}
        r2Configured={r2}
      />
    </div>
  );
}
