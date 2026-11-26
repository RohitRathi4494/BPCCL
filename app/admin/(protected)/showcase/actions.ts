"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadPublicObject,
  deletePublicObject,
  publicStorageConfigured,
} from "@/lib/storage";
import {
  extractYouTubeId,
  isShortsLink,
  fetchYouTubeOEmbed,
  youtubePoster,
} from "@/lib/ground/youtube";
import type { TablesInsert, TablesUpdate } from "@/lib/types";
import {
  LEGEND_QUOTE_MAX,
  MAX_VISIBLE_REELS,
  REEL_QUOTE_MAX,
  type ReelPreview,
  type ShowcaseState,
  type UploadResult,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const PHOTO_MAX_BYTES = 600_000; // compressed client-side; generous cap
const IMG_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

async function ensureAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Your session expired — please sign in again.";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return "Admins only.";
  return null;
}

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/admin/showcase");
}

async function imageBytes(
  file: unknown,
): Promise<{ bytes: Uint8Array; type: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "No file was provided." };
  if (!IMG_TYPES.includes(file.type as (typeof IMG_TYPES)[number]))
    return { error: "Use a WebP, JPG or PNG image." };
  if (file.size > PHOTO_MAX_BYTES) return { error: "Image is too large." };
  return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };
}

function str(formData: FormData, k: string): string | null {
  const v = String(formData.get(k) ?? "").trim();
  return v.length ? v : null;
}

/** "yyyy-mm" (month input) or "yyyy-mm-dd" → first-of-month date string, else null. */
function monthToDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-01`;
}

// =============================================================================
// LEGENDS
// =============================================================================

/** Upload a (client-compressed, 4:5) legend portrait. Returns the R2 key. */
export async function uploadLegendPhoto(formData: FormData): Promise<UploadResult> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured()) return { error: "Cloudflare R2 is not configured." };
  const parsed = await imageBytes(formData.get("file"));
  if ("error" in parsed) return { error: parsed.error };
  const ext = IMG_EXT[parsed.type] ?? "webp";
  const key = `legends/${crypto.randomUUID()}.${ext}`;
  try {
    const { url } = await uploadPublicObject({ key, bytes: parsed.bytes, contentType: parsed.type });
    return { key, url };
  } catch (e) {
    console.error("uploadLegendPhoto:", e);
    return { error: "Upload failed — please try again." };
  }
}

/**
 * Create or update a legend. On create, a portrait r2_key + alt_text are
 * required (both NOT NULL in the DB). An optional YouTube link is validated via
 * oEmbed; a blank link clears any existing clip.
 */
export async function saveLegend(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("id") ?? "");
  const name = str(formData, "name");
  if (!name) return { error: "Enter the player's name." };

  const quote = str(formData, "quote");
  if (quote && quote.length > LEGEND_QUOTE_MAX)
    return { error: `Quote must be ${LEGEND_QUOTE_MAX} characters or fewer.` };

  const country = str(formData, "country");
  if (country && !/^[A-Za-z]{2}$/.test(country))
    return { error: "Country must be a 2-letter code (e.g. AU, IN, ZA)." };

  // Optional YouTube clip (same parser + oEmbed check as reels).
  let youtubeId: string | null = null;
  const link = str(formData, "youtube_url");
  if (link) {
    const vid = extractYouTubeId(link);
    if (!vid) return { error: "That YouTube link doesn't look valid." };
    const oembed = await fetchYouTubeOEmbed(vid);
    if (!oembed.ok) return { error: oembed.reason };
    youtubeId = vid;
  }

  const base = {
    name,
    country: country ? country.toUpperCase() : null,
    team_or_role: str(formData, "team_or_role"),
    visit_type: str(formData, "visit_type"),
    visit_month: monthToDate(str(formData, "visit_month")),
    youtube_id: youtubeId,
    quote,
    permission_note: str(formData, "permission_note"),
  };

  const supabase = await createClient();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "Invalid legend." };
    const patch: TablesUpdate<"legends"> = { ...base };
    const altText = str(formData, "alt_text");
    if (altText) patch.alt_text = altText;
    const newKey = str(formData, "r2_key");
    if (newKey) patch.r2_key = newKey; // replacing the portrait
    const { error } = await supabase.from("legends").update(patch).eq("id", id);
    if (error) {
      console.error("saveLegend update:", error.message);
      return { error: "Could not save the legend." };
    }
  } else {
    const r2_key = str(formData, "r2_key");
    const alt_text = str(formData, "alt_text");
    if (!r2_key) return { error: "Upload a portrait photo first." };
    if (!alt_text) return { error: "Add alt text that describes the photo." };
    const row: TablesInsert<"legends"> = {
      ...base,
      r2_key,
      alt_text,
      is_visible: false,
      permission_confirmed: false,
    };
    const { error } = await supabase.from("legends").insert(row);
    if (error) {
      console.error("saveLegend insert:", error.message);
      return { error: "Could not add the legend." };
    }
  }
  revalidatePublic();
  return { ok: true };
}

/** Feature exactly one legend (un-features the rest), or clear the feature. */
export async function setLegendFeatured(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid legend." };
  const featured = formData.get("is_featured") === "true";

  const supabase = await createClient();
  // Clear any current feature first so the partial-unique index never collides.
  const { error: clearErr } = await supabase
    .from("legends")
    .update({ is_featured: false })
    .eq("is_featured", true);
  if (clearErr) {
    console.error("setLegendFeatured clear:", clearErr.message);
    return { error: "Could not update the featured legend." };
  }
  if (featured) {
    const { error } = await supabase.from("legends").update({ is_featured: true }).eq("id", id);
    if (error) {
      console.error("setLegendFeatured set:", error.message);
      return { error: "Could not set the featured legend." };
    }
  }
  revalidatePublic();
  return { ok: true };
}

/** Toggle permission for a legend. Withdrawing permission also un-publishes it. */
export async function setLegendPermission(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid legend." };
  const confirmed = formData.get("permission_confirmed") === "true";
  const patch: TablesUpdate<"legends"> = { permission_confirmed: confirmed };
  if (!confirmed) patch.is_visible = false;
  const supabase = await createClient();
  const { error } = await supabase.from("legends").update(patch).eq("id", id);
  if (error) return { error: "Could not update permission." };
  revalidatePublic();
  return { ok: true };
}

/** Publish / unpublish a legend, enforcing the permission gate. */
export async function setLegendVisibility(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid legend." };
  const visible = formData.get("is_visible") === "true";

  const supabase = await createClient();
  if (visible) {
    const { data: row } = await supabase
      .from("legends")
      .select("permission_confirmed")
      .eq("id", id)
      .maybeSingle();
    if (!row?.permission_confirmed)
      return { error: "Confirm permission before making this legend visible." };
  }
  const { error } = await supabase.from("legends").update({ is_visible: visible }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePublic();
  return { ok: true };
}

export async function reorderLegends(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const ids = parseIds(formData);
  if (!ids) return { error: "Invalid order." };
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("legends").update({ display_order: i }).eq("id", ids[i]);
    if (error) return { error: "Could not save the order." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Delete a legend and its portrait object. */
export async function deleteLegend(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid legend." };
  const supabase = await createClient();
  const { data: row } = await supabase.from("legends").select("r2_key").eq("id", id).maybeSingle();
  const { error } = await supabase.from("legends").delete().eq("id", id);
  if (error) return { error: "Could not delete the legend." };
  if (row?.r2_key) await deletePublicObject(row.r2_key).catch(() => {});
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// REELS
// =============================================================================

/** Validate + preview a pasted YouTube link (id extraction + oEmbed). */
export async function previewReel(formData: FormData): Promise<ReelPreview> {
  const authErr = await ensureAdmin();
  if (authErr) return { ok: false, error: authErr };
  const raw = String(formData.get("url") ?? "");
  const id = extractYouTubeId(raw);
  if (!id) return { ok: false, error: "That doesn't look like a YouTube link." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("reels")
    .select("id", { count: "exact", head: true })
    .eq("youtube_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: "That reel has already been added." };

  const oembed = await fetchYouTubeOEmbed(id);
  if (!oembed.ok) return { ok: false, error: oembed.reason };
  return {
    ok: true,
    youtubeId: id,
    title: oembed.title,
    format: isShortsLink(raw) ? "short" : "video",
    poster: youtubePoster(id),
  };
}

/** Upload a custom 9:16 reel poster (client-compressed); returns the R2 key. */
export async function uploadReelPoster(formData: FormData): Promise<UploadResult> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured()) return { error: "Cloudflare R2 is not configured." };
  const parsed = await imageBytes(formData.get("file"));
  if ("error" in parsed) return { error: parsed.error };
  const ext = IMG_EXT[parsed.type] ?? "webp";
  const key = `reels/posters/${crypto.randomUUID()}.${ext}`;
  try {
    const { url } = await uploadPublicObject({ key, bytes: parsed.bytes, contentType: parsed.type });
    return { key, url };
  } catch (e) {
    console.error("uploadReelPoster:", e);
    return { error: "Upload failed." };
  }
}

/** Add a reel (re-validates via oEmbed server-side). */
export async function addReel(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const raw = String(formData.get("url") ?? "");
  const id = extractYouTubeId(raw);
  if (!id) return { error: "That doesn't look like a YouTube link." };

  const personName = str(formData, "person_name");
  if (!personName) return { error: "Enter the person's name." };

  const quote = str(formData, "quote");
  if (quote && quote.length > REEL_QUOTE_MAX)
    return { error: `Quote must be ${REEL_QUOTE_MAX} characters or fewer.` };

  const fmtRaw = String(formData.get("video_format") ?? "");
  const video_format =
    fmtRaw === "short" || fmtRaw === "video" ? fmtRaw : isShortsLink(raw) ? "short" : "video";

  const oembed = await fetchYouTubeOEmbed(id);
  if (!oembed.ok) return { error: oembed.reason };

  const wantVisible = formData.get("is_visible") === "on";
  const permission = formData.get("permission_confirmed") === "on";
  if (wantVisible && !permission)
    return { error: "Confirm permission before publishing this reel." };

  const supabase = await createClient();
  if (wantVisible) {
    const { count } = await supabase
      .from("reels")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true);
    if ((count ?? 0) >= MAX_VISIBLE_REELS)
      return { error: `You can show at most ${MAX_VISIBLE_REELS} reels. Hide one first.` };
  }

  const row: TablesInsert<"reels"> = {
    youtube_id: id,
    video_format,
    title: str(formData, "title") ?? oembed.title,
    person_name: personName,
    person_role: str(formData, "person_role"),
    quote,
    duration_label: str(formData, "duration_label"),
    custom_poster_r2_key: str(formData, "custom_poster_r2_key"),
    permission_confirmed: permission,
    is_visible: wantVisible && permission,
  };
  const { error } = await supabase.from("reels").insert(row);
  if (error) {
    if (error.code === "23505") return { error: "That reel has already been added." };
    console.error("addReel:", error.message);
    return { error: "Could not save the reel." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Edit a reel's text/meta fields (not the YouTube id). */
export async function updateReel(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid reel." };

  const personName = str(formData, "person_name");
  if (!personName) return { error: "Enter the person's name." };
  const quote = str(formData, "quote");
  if (quote && quote.length > REEL_QUOTE_MAX)
    return { error: `Quote must be ${REEL_QUOTE_MAX} characters or fewer.` };
  const fmtRaw = String(formData.get("video_format") ?? "");
  const patch: TablesUpdate<"reels"> = {
    person_name: personName,
    person_role: str(formData, "person_role"),
    quote,
    duration_label: str(formData, "duration_label"),
    title: str(formData, "title"),
  };
  if (fmtRaw === "short" || fmtRaw === "video") patch.video_format = fmtRaw;
  const newPoster = str(formData, "custom_poster_r2_key");
  if (formData.has("custom_poster_r2_key")) patch.custom_poster_r2_key = newPoster;

  const supabase = await createClient();
  const { error } = await supabase.from("reels").update(patch).eq("id", id);
  if (error) {
    console.error("updateReel:", error.message);
    return { error: "Could not save changes." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function setReelPermission(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid reel." };
  const confirmed = formData.get("permission_confirmed") === "true";
  const patch: TablesUpdate<"reels"> = { permission_confirmed: confirmed };
  if (!confirmed) patch.is_visible = false;
  const supabase = await createClient();
  const { error } = await supabase.from("reels").update(patch).eq("id", id);
  if (error) return { error: "Could not update permission." };
  revalidatePublic();
  return { ok: true };
}

export async function setReelVisibility(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid reel." };
  const visible = formData.get("is_visible") === "true";

  const supabase = await createClient();
  if (visible) {
    const { data: row } = await supabase
      .from("reels")
      .select("permission_confirmed")
      .eq("id", id)
      .maybeSingle();
    if (!row?.permission_confirmed)
      return { error: "Confirm permission before making this reel visible." };
    const { count } = await supabase
      .from("reels")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true);
    if ((count ?? 0) >= MAX_VISIBLE_REELS)
      return { error: `You can show at most ${MAX_VISIBLE_REELS} reels. Hide one first.` };
  }
  const { error } = await supabase.from("reels").update({ is_visible: visible }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePublic();
  return { ok: true };
}

export async function reorderReels(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const ids = parseIds(formData);
  if (!ids) return { error: "Invalid order." };
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("reels").update({ display_order: i }).eq("id", ids[i]);
    if (error) return { error: "Could not save the order." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Delete a reel and its custom poster object (if any). */
export async function deleteReel(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid reel." };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("reels")
    .select("custom_poster_r2_key")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("reels").delete().eq("id", id);
  if (error) return { error: "Could not delete the reel." };
  if (row?.custom_poster_r2_key) await deletePublicObject(row.custom_poster_r2_key).catch(() => {});
  revalidatePublic();
  return { ok: true };
}

/** Re-run oEmbed on every reel; auto-hide any that no longer embed. */
export async function recheckReels(): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const supabase = await createClient();
  const { data: reels, error } = await supabase.from("reels").select("id, youtube_id, is_visible");
  if (error) return { error: "Could not load reels." };

  let hidden = 0;
  let checked = 0;
  for (const r of reels ?? []) {
    checked++;
    const res = await fetchYouTubeOEmbed(r.youtube_id);
    if (!res.ok && r.is_visible) {
      await supabase.from("reels").update({ is_visible: false }).eq("id", r.id);
      hidden++;
    }
  }
  revalidatePublic();
  return {
    ok: true,
    message:
      hidden > 0
        ? `Checked ${checked} reels — auto-hid ${hidden} that no longer embed.`
        : `Checked ${checked} reels — all still embeddable.`,
  };
}

// =============================================================================
// SETTINGS (also-trained chips, removal email, YouTube channel)
// =============================================================================

export async function updateShowcaseSettings(formData: FormData): Promise<ShowcaseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  // Only touch the fields the submitting form actually included, so the Legends
  // settings form (also-trained + removal email) and the Reels settings form
  // (channel URL) don't clobber each other's columns.
  const patch: TablesUpdate<"league_settings"> = {};

  if (formData.has("legends_also_trained")) {
    let alsoTrained: string[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("legends_also_trained") ?? "[]"));
      if (Array.isArray(parsed))
        alsoTrained = parsed.map((s) => String(s).trim()).filter(Boolean).slice(0, 50);
    } catch {
      alsoTrained = [];
    }
    patch.legends_also_trained = alsoTrained.length ? alsoTrained : null;
  }

  if (formData.has("removal_contact_email")) {
    const email = str(formData, "removal_contact_email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return { error: "Enter a valid removal-contact email." };
    patch.removal_contact_email = email;
  }

  if (formData.has("youtube_channel_url")) {
    patch.youtube_channel_url = str(formData, "youtube_channel_url");
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("league_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!existing) return { error: "League settings row is missing." };
  const { error } = await supabase.from("league_settings").update(patch).eq("id", existing.id);
  if (error) {
    console.error("updateShowcaseSettings:", error.message);
    return { error: "Could not save settings." };
  }
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// shared helpers
// =============================================================================
function parseIds(formData: FormData): string[] | null {
  let ids: unknown;
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string" || !UUID_RE.test(i)))
    return null;
  return ids as string[];
}
