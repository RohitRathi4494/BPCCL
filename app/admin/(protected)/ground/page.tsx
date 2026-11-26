import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings } from "@/lib/queries/settings";
import { publicStorageConfigured, publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import {
  GroundManager,
  type PhotoView,
  type ReelView,
  type ClientView,
  type ShowcaseSettingsView,
} from "@/components/admin/ground/ground-manager";
import type { Client, GroundMedia, Reel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminGroundPage() {
  await requireAdmin();
  const r2 = publicStorageConfigured();
  const urlFor = (key: string | null): string | null =>
    key && r2 ? publicObjectUrl(key) : null;

  const supabase = await createClient();
  const [mediaRes, reelsRes, clientsRes, settings] = await Promise.all([
    supabase.from("ground_media").select("*").order("display_order", { ascending: true }),
    supabase.from("reels").select("*").order("display_order", { ascending: true }),
    supabase.from("clients").select("*").order("display_order", { ascending: true }),
    getLeagueSettings(),
  ]);

  const media = (mediaRes.data ?? []) as GroundMedia[];

  const photos: PhotoView[] = media
    .filter((m) => m.kind === "photo")
    .map((m) => ({
      id: m.id,
      title: m.title,
      caption: m.caption,
      alt: m.alt_text,
      url: urlFor(m.r2_key) ?? "",
      isFeatured: m.is_featured,
      isVisible: m.is_visible,
      consent: m.consent_confirmed,
    }));

  const reels: ReelView[] = ((reelsRes.data ?? []) as Reel[]).map((r) => ({
    id: r.id,
    youtubeId: r.youtube_id,
    format: r.video_format === "short" ? "short" : "video",
    title: r.title,
    personName: r.person_name,
    personRole: r.person_role,
    quote: r.quote,
    durationLabel: r.duration_label,
    hasCustomPoster: !!r.custom_poster_r2_key,
    poster: r.custom_poster_r2_key
      ? publicObjectUrl(r.custom_poster_r2_key)
      : youtubePoster(r.youtube_id),
    isVisible: r.is_visible,
    permission: r.permission_confirmed,
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

  const settingsView: ShowcaseSettingsView = {
    youtubeChannelUrl: settings?.youtube_channel_url ?? "",
  };

  const visibleReels = reels.filter((r) => r.isVisible).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Venue &amp; Showcase</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ground photos, player / personality reels and client logos for the home page and
          /ballpark. Nothing shows publicly until it&apos;s marked visible (and consent /
          permission is confirmed).
        </p>
      </div>
      <GroundManager
        photos={photos}
        reels={reels}
        clients={clients}
        settings={settingsView}
        visibleReels={visibleReels}
        r2Configured={r2}
      />
    </div>
  );
}
