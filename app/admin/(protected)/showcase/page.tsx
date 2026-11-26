import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings } from "@/lib/queries/settings";
import { publicStorageConfigured, publicObjectUrl } from "@/lib/storage";
import { youtubePoster } from "@/lib/ground/youtube";
import {
  ShowcaseManager,
  type LegendView,
  type ReelView,
  type ShowcaseSettingsView,
} from "@/components/admin/showcase/showcase-manager";
import type { Legend, Reel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminShowcasePage() {
  await requireAdmin();
  const r2 = publicStorageConfigured();
  const supabase = await createClient();

  const [legendsRes, reelsRes, settings] = await Promise.all([
    supabase.from("legends").select("*").order("display_order", { ascending: true }),
    supabase.from("reels").select("*").order("display_order", { ascending: true }),
    getLeagueSettings(),
  ]);

  const legends: LegendView[] = ((legendsRes.data ?? []) as Legend[]).map((l) => ({
    id: l.id,
    name: l.name,
    country: l.country,
    teamOrRole: l.team_or_role,
    visitType: l.visit_type,
    visitMonth: l.visit_month ? l.visit_month.slice(0, 7) : "", // "yyyy-mm" for the month input
    youtubeId: l.youtube_id,
    quote: l.quote,
    alt: l.alt_text,
    photoUrl: publicObjectUrl(l.r2_key),
    permissionNote: l.permission_note,
    isFeatured: l.is_featured,
    isVisible: l.is_visible,
    permission: l.permission_confirmed,
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

  const settingsView: ShowcaseSettingsView = {
    alsoTrained: settings?.legends_also_trained ?? [],
    removalEmail: settings?.removal_contact_email ?? "",
    youtubeChannelUrl: settings?.youtube_channel_url ?? "",
  };

  const visibleReels = reels.filter((r) => r.isVisible).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Legends &amp; Reels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          International stars photographed at Ballpark, and short video reels from the people who
          play here — both shown on the home page. Nothing about a person is public until you tick
          &ldquo;Permission confirmed.&rdquo;
        </p>
      </div>
      <ShowcaseManager
        legends={legends}
        reels={reels}
        settings={settingsView}
        visibleReels={visibleReels}
        r2Configured={r2}
      />
    </div>
  );
}
