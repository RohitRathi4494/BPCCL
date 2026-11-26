import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicStorageConfigured, publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import {
  GroundManager,
  type PhotoView,
  type VideoView,
  type ClientView,
} from "@/components/admin/ground/ground-manager";
import type { Client, GroundMedia } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminGroundPage() {
  await requireAdmin();
  const r2 = publicStorageConfigured();
  const urlFor = (key: string | null): string | null =>
    key && r2 ? publicObjectUrl(key) : null;

  const supabase = await createClient();
  const [mediaRes, clientsRes] = await Promise.all([
    supabase.from("ground_media").select("*").order("display_order", { ascending: true }),
    supabase.from("clients").select("*").order("display_order", { ascending: true }),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Ground &amp; Trust</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos, ground tour clips and client logos for the home page and /ballpark.
          Player-feedback reels live under &ldquo;Legends &amp; Reels&rdquo;. Nothing shows
          publicly until it&apos;s marked visible (and consent / permission is confirmed).
        </p>
      </div>
      <GroundManager photos={photos} videos={videos} clients={clients} r2Configured={r2} />
    </div>
  );
}
