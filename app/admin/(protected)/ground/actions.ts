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
import { sanitizeSvg } from "@/lib/ground/svg";
import type { TablesInsert, TablesUpdate } from "@/lib/types";

export type GroundState = { error?: string; ok?: boolean; message?: string };

/** Max videos that may be VISIBLE within one section (testimonial / ground). */
export const MAX_VISIBLE_VIDEOS = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PHOTO_UPLOAD_MAX_BYTES = 600_000; // compressed client-side to ≤250 KB; generous cap
const LOGO_MAX_BYTES = 300_000;
const HERO_VIDEO_MAX_BYTES = 3 * 1024 * 1024;
const HERO_POSTER_MAX_BYTES = 600_000;

const IMG_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

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
  revalidatePath("/ballpark");
  revalidatePath("/admin/ground");
}

async function fileBytes(
  file: unknown,
  maxBytes: number,
  allowed: readonly string[],
): Promise<{ bytes: Uint8Array; type: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "No file was provided." };
  if (!allowed.includes(file.type)) return { error: "Unsupported file type." };
  if (file.size > maxBytes) return { error: "File is too large." };
  return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };
}

// =============================================================================
// PHOTOS
// =============================================================================

/** Upload one (client-compressed) ground/testimonial photo as a hidden draft. */
export async function uploadGroundPhoto(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured())
    return { error: "Cloudflare R2 public storage is not configured." };

  const section = String(formData.get("section") ?? "ground");
  if (section !== "ground" && section !== "testimonial")
    return { error: "Invalid section." };

  const parsed = await fileBytes(formData.get("file"), PHOTO_UPLOAD_MAX_BYTES, [
    "image/webp",
    "image/jpeg",
    "image/png",
  ]);
  if ("error" in parsed) return { error: parsed.error };

  const ext = IMG_EXT[parsed.type] ?? "webp";
  const key = `ground/${crypto.randomUUID()}.${ext}`;
  try {
    await uploadPublicObject({ key, bytes: parsed.bytes, contentType: parsed.type });
  } catch (e) {
    console.error("uploadGroundPhoto:", e);
    return { error: "Upload failed — please try again." };
  }

  const title = String(formData.get("title") ?? "").trim() || null;
  const supabase = await createClient();
  const row: TablesInsert<"ground_media"> = {
    kind: "photo",
    section,
    r2_key: key,
    title,
    alt_text: "",
    is_visible: false,
    consent_confirmed: false,
  };
  const { error } = await supabase.from("ground_media").insert(row);
  if (error) {
    await deletePublicObject(key); // don't orphan the object
    console.error("uploadGroundPhoto insert:", error.message);
    return { error: "Could not save the photo." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Edit a media row's text/meta fields (photo or video). */
export async function updateGroundMedia(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid item." };

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length ? v : null;
  };
  const section = String(formData.get("section") ?? "");
  const quote = str("quote");
  if (quote && quote.length > 140) return { error: "Quote must be 140 characters or fewer." };
  const videoFormatRaw = String(formData.get("video_format") ?? "");
  const video_format =
    videoFormatRaw === "short" || videoFormatRaw === "video" ? videoFormatRaw : undefined;

  const patch: TablesUpdate<"ground_media"> = {
    title: str("title"),
    caption: str("caption"),
    alt_text: str("alt_text"),
    person_name: str("person_name"),
    person_role: str("person_role"),
    quote,
    is_featured: formData.get("is_featured") === "on",
  };
  if (section === "ground" || section === "testimonial") patch.section = section;
  if (video_format) patch.video_format = video_format;

  const supabase = await createClient();
  const { error } = await supabase.from("ground_media").update(patch).eq("id", id);
  if (error) {
    console.error("updateGroundMedia:", error.message);
    return { error: "Could not save changes." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Toggle consent for a media row. Also un-publishes if consent is withdrawn. */
export async function setMediaConsent(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid item." };
  const confirmed = formData.get("consent_confirmed") === "true";

  const supabase = await createClient();
  const patch: TablesUpdate<"ground_media"> = { consent_confirmed: confirmed };
  if (!confirmed) patch.is_visible = false; // can't stay visible without consent
  const { error } = await supabase.from("ground_media").update(patch).eq("id", id);
  if (error) {
    console.error("setMediaConsent:", error.message);
    return { error: "Could not update consent." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Publish / unpublish a media row, enforcing consent, alt-text and the cap. */
export async function setMediaVisibility(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid item." };
  const visible = formData.get("is_visible") === "true";

  const supabase = await createClient();
  const { data: row, error: readErr } = await supabase
    .from("ground_media")
    .select("kind, section, consent_confirmed, alt_text, r2_key, youtube_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !row) return { error: "Item not found." };

  if (visible) {
    if (!row.consent_confirmed)
      return { error: "Confirm consent before making this visible." };
    if (row.kind === "photo" && !(row.alt_text && row.alt_text.trim()))
      return { error: "Add alt text before publishing this photo." };
    if (row.kind === "video") {
      const { count } = await supabase
        .from("ground_media")
        .select("id", { count: "exact", head: true })
        .eq("kind", "video")
        .eq("section", row.section)
        .eq("is_visible", true);
      if ((count ?? 0) >= MAX_VISIBLE_VIDEOS)
        return {
          error: `You can show at most ${MAX_VISIBLE_VIDEOS} ${row.section} videos. Hide one first.`,
        };
    }
  }

  const { error } = await supabase
    .from("ground_media")
    .update({ is_visible: visible })
    .eq("id", id);
  if (error) {
    console.error("setMediaVisibility:", error.message);
    return { error: "Could not update visibility." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Persist a new display order for a set of media ids. */
export async function reorderMedia(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  let ids: string[];
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return { error: "Invalid order." };
  }
  if (!Array.isArray(ids) || ids.some((i) => !UUID_RE.test(i)))
    return { error: "Invalid order." };

  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("ground_media")
      .update({ display_order: i })
      .eq("id", ids[i]);
    if (error) {
      console.error("reorderMedia:", error.message);
      return { error: "Could not save the order." };
    }
  }
  revalidatePublic();
  return { ok: true };
}

/** Delete a media row and its R2 object (photos + custom video posters). */
export async function deleteGroundMedia(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid item." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("ground_media")
    .select("r2_key")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("ground_media").delete().eq("id", id);
  if (error) {
    console.error("deleteGroundMedia:", error.message);
    return { error: "Could not delete the item." };
  }
  if (row?.r2_key) await deletePublicObject(row.r2_key).catch(() => {});
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// VIDEOS
// =============================================================================

export type VideoPreview =
  | { ok: true; youtubeId: string; title: string; format: "video" | "short"; poster: string }
  | { ok: false; error: string };

/** Validate + preview a pasted YouTube link (id extraction + oEmbed). */
export async function previewYouTube(formData: FormData): Promise<VideoPreview> {
  const authErr = await ensureAdmin();
  if (authErr) return { ok: false, error: authErr };
  const raw = String(formData.get("url") ?? "");
  const id = extractYouTubeId(raw);
  if (!id) return { ok: false, error: "That doesn't look like a YouTube link." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("ground_media")
    .select("id", { count: "exact", head: true })
    .eq("youtube_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: "That video has already been added." };

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

/** Add a hand-picked YouTube video (re-validates via oEmbed server-side). */
export async function addGroundVideo(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const raw = String(formData.get("url") ?? "");
  const id = extractYouTubeId(raw);
  if (!id) return { error: "That doesn't look like a YouTube link." };

  const section = String(formData.get("section") ?? "testimonial");
  if (section !== "testimonial" && section !== "ground")
    return { error: "Invalid section." };

  const fmtRaw = String(formData.get("video_format") ?? "");
  const video_format =
    fmtRaw === "short" || fmtRaw === "video" ? fmtRaw : isShortsLink(raw) ? "short" : "video";

  const quote = String(formData.get("quote") ?? "").trim() || null;
  if (quote && quote.length > 140) return { error: "Quote must be 140 characters or fewer." };

  const oembed = await fetchYouTubeOEmbed(id);
  if (!oembed.ok) return { error: oembed.reason };

  const title = String(formData.get("title") ?? "").trim() || oembed.title;
  const posterKey = String(formData.get("poster_key") ?? "").trim() || null;

  const supabase = await createClient();
  const row: TablesInsert<"ground_media"> = {
    kind: "video",
    section,
    youtube_id: id,
    video_format,
    title,
    person_name: String(formData.get("person_name") ?? "").trim() || null,
    person_role: String(formData.get("person_role") ?? "").trim() || null,
    quote,
    r2_key: posterKey,
    is_featured: formData.get("is_featured") === "on",
    consent_confirmed: formData.get("consent_confirmed") === "on",
    is_visible: false,
  };
  const { error } = await supabase.from("ground_media").insert(row);
  if (error) {
    if (error.code === "23505") return { error: "That video has already been added." };
    console.error("addGroundVideo:", error.message);
    return { error: "Could not save the video." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Upload a custom video poster (client-compressed); returns the R2 key. */
export async function uploadVideoPoster(
  formData: FormData,
): Promise<{ key?: string; url?: string; error?: string }> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured()) return { error: "R2 is not configured." };
  const parsed = await fileBytes(formData.get("file"), HERO_POSTER_MAX_BYTES, [
    "image/webp",
    "image/jpeg",
    "image/png",
  ]);
  if ("error" in parsed) return { error: parsed.error };
  const ext = IMG_EXT[parsed.type] ?? "webp";
  const key = `ground/posters/${crypto.randomUUID()}.${ext}`;
  try {
    const { url } = await uploadPublicObject({ key, bytes: parsed.bytes, contentType: parsed.type });
    return { key, url };
  } catch (e) {
    console.error("uploadVideoPoster:", e);
    return { error: "Upload failed." };
  }
}

/** Re-run oEmbed on every video; auto-hide any that no longer embed. */
export async function recheckVideos(): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const supabase = await createClient();
  const { data: videos, error } = await supabase
    .from("ground_media")
    .select("id, youtube_id, is_visible")
    .eq("kind", "video");
  if (error) return { error: "Could not load videos." };

  let hidden = 0;
  let checked = 0;
  for (const v of videos ?? []) {
    if (!v.youtube_id) continue;
    checked++;
    const res = await fetchYouTubeOEmbed(v.youtube_id);
    if (!res.ok && v.is_visible) {
      await supabase.from("ground_media").update({ is_visible: false }).eq("id", v.id);
      hidden++;
    }
  }
  revalidatePublic();
  return {
    ok: true,
    message:
      hidden > 0
        ? `Checked ${checked} videos — auto-hid ${hidden} that no longer embed.`
        : `Checked ${checked} videos — all still embeddable.`,
  };
}

// =============================================================================
// CLIENTS
// =============================================================================

/** Upload a client logo (SVG sanitised, or PNG). Returns the R2 key. */
export async function uploadClientLogo(
  formData: FormData,
): Promise<{ key?: string; url?: string; error?: string }> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured()) return { error: "R2 is not configured." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file was provided." };
  if (file.size > LOGO_MAX_BYTES) return { error: "Logo must be under 300 KB." };

  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const isPng = file.type === "image/png";
  if (!isSvg && !isPng) return { error: "Use an SVG or PNG logo." };

  let bytes: Uint8Array;
  let contentType: string;
  let ext: string;
  if (isSvg) {
    const text = await file.text();
    const clean = sanitizeSvg(text);
    if (!clean.ok) return { error: clean.reason };
    bytes = new TextEncoder().encode(clean.svg);
    contentType = "image/svg+xml";
    ext = "svg";
  } else {
    bytes = new Uint8Array(await file.arrayBuffer());
    contentType = "image/png";
    ext = "png";
  }

  const key = `clients/${crypto.randomUUID()}.${ext}`;
  try {
    const { url } = await uploadPublicObject({ key, bytes, contentType });
    return { key, url };
  } catch (e) {
    console.error("uploadClientLogo:", e);
    return { error: "Upload failed." };
  }
}

export async function saveClient(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter the client name." };
  const logoKey = String(formData.get("logo_r2_key") ?? "").trim() || null;
  const website = String(formData.get("website_url") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  const supabase = await createClient();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "Invalid client." };
    const patch: TablesUpdate<"clients"> = {
      name,
      website_url: website,
      category,
    };
    if (formData.has("logo_r2_key")) patch.logo_r2_key = logoKey;
    const { error } = await supabase.from("clients").update(patch).eq("id", id);
    if (error) return { error: "Could not save the client." };
  } else {
    const row: TablesInsert<"clients"> = {
      name,
      logo_r2_key: logoKey,
      website_url: website,
      category,
      is_visible: false,
      permission_confirmed: false,
    };
    const { error } = await supabase.from("clients").insert(row);
    if (error) return { error: "Could not add the client." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function setClientPermission(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid client." };
  const confirmed = formData.get("permission_confirmed") === "true";
  const supabase = await createClient();
  const patch: TablesUpdate<"clients"> = { permission_confirmed: confirmed };
  if (!confirmed) patch.is_visible = false;
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) return { error: "Could not update permission." };
  revalidatePublic();
  return { ok: true };
}

export async function setClientVisibility(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid client." };
  const visible = formData.get("is_visible") === "true";

  const supabase = await createClient();
  if (visible) {
    const { data: row } = await supabase
      .from("clients")
      .select("permission_confirmed")
      .eq("id", id)
      .maybeSingle();
    if (!row?.permission_confirmed)
      return { error: "Confirm you have permission to display this logo first." };
  }
  const { error } = await supabase.from("clients").update({ is_visible: visible }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePublic();
  return { ok: true };
}

export async function reorderClients(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  let ids: string[];
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return { error: "Invalid order." };
  }
  if (!Array.isArray(ids) || ids.some((i) => !UUID_RE.test(i))) return { error: "Invalid order." };
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("clients").update({ display_order: i }).eq("id", ids[i]);
    if (error) return { error: "Could not save the order." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function deleteClient(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid client." };
  const supabase = await createClient();
  const { data: row } = await supabase.from("clients").select("logo_r2_key").eq("id", id).maybeSingle();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: "Could not delete the client." };
  if (row?.logo_r2_key) await deletePublicObject(row.logo_r2_key).catch(() => {});
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// GROUND FACTS
// =============================================================================

export async function saveFact(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Enter a label." };
  const value = String(formData.get("value") ?? "").trim() || null;
  const icon = String(formData.get("icon") ?? "").trim() || null;

  const supabase = await createClient();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "Invalid fact." };
    const { error } = await supabase.from("ground_facts").update({ label, value, icon }).eq("id", id);
    if (error) return { error: "Could not save the fact." };
  } else {
    const { error } = await supabase
      .from("ground_facts")
      .insert({ label, value, icon, is_visible: true } satisfies TablesInsert<"ground_facts">);
    if (error) return { error: "Could not add the fact." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function setFactVisibility(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid fact." };
  const visible = formData.get("is_visible") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("ground_facts").update({ is_visible: visible }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePublic();
  return { ok: true };
}

export async function reorderFacts(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  let ids: string[];
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return { error: "Invalid order." };
  }
  if (!Array.isArray(ids) || ids.some((i) => !UUID_RE.test(i))) return { error: "Invalid order." };
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("ground_facts").update({ display_order: i }).eq("id", ids[i]);
    if (error) return { error: "Could not save the order." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function deleteFact(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid fact." };
  const supabase = await createClient();
  const { error } = await supabase.from("ground_facts").delete().eq("id", id);
  if (error) return { error: "Could not delete the fact." };
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// FAQs
// =============================================================================

export async function saveFaq(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question) return { error: "Enter the question." };

  const supabase = await createClient();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "Invalid FAQ." };
    const { error } = await supabase.from("faqs").update({ question, answer }).eq("id", id);
    if (error) return { error: "Could not save the FAQ." };
  } else {
    const { error } = await supabase
      .from("faqs")
      .insert({ question, answer, is_visible: false } satisfies TablesInsert<"faqs">);
    if (error) return { error: "Could not add the FAQ." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function setFaqVisibility(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid FAQ." };
  const visible = formData.get("is_visible") === "true";
  const supabase = await createClient();
  if (visible) {
    const { data: row } = await supabase.from("faqs").select("answer").eq("id", id).maybeSingle();
    if (!row?.answer || !row.answer.trim())
      return { error: "Add an answer before making this FAQ visible." };
  }
  const { error } = await supabase.from("faqs").update({ is_visible: visible }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePublic();
  return { ok: true };
}

export async function reorderFaqs(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  let ids: string[];
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    return { error: "Invalid order." };
  }
  if (!Array.isArray(ids) || ids.some((i) => !UUID_RE.test(i))) return { error: "Invalid order." };
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("faqs").update({ display_order: i * 10 }).eq("id", ids[i]);
    if (error) return { error: "Could not save the order." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function deleteFaq(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid FAQ." };
  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { error: "Could not delete the FAQ." };
  revalidatePublic();
  return { ok: true };
}

// =============================================================================
// GROUND INFO (league_settings) + hero media
// =============================================================================

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function updateGroundSettings(formData: FormData): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const patch: TablesUpdate<"league_settings"> = {
    ground_name: str("ground_name"),
    ground_tagline: str("ground_tagline"),
    ground_address: str("ground_address"),
    ground_map_url: str("ground_map_url"),
    ground_lat: numOrNull(formData.get("ground_lat")),
    ground_lng: numOrNull(formData.get("ground_lng")),
    ground_whatsapp: str("ground_whatsapp"),
    youtube_channel_url: str("youtube_channel_url"),
    stat_clients: numOrNull(formData.get("stat_clients")),
    stat_years: numOrNull(formData.get("stat_years")),
    stat_matches_hosted: numOrNull(formData.get("stat_matches_hosted")),
  };
  const minAge = numOrNull(formData.get("min_age"));
  const seniorAge = numOrNull(formData.get("senior_age"));
  if (minAge !== null) patch.min_age = minAge;
  if (seniorAge !== null) patch.senior_age = seniorAge;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("league_settings").select("id").limit(1).maybeSingle();
  if (!existing) return { error: "League settings row is missing." };
  const { error } = await supabase.from("league_settings").update(patch).eq("id", existing.id);
  if (error) {
    console.error("updateGroundSettings:", error.message);
    return { error: "Could not save settings." };
  }
  revalidatePublic();
  return { ok: true };
}

/** Upload the hero loop video (MP4 ≤3 MB) and/or its poster; store the keys. */
export async function uploadHeroMedia(
  formData: FormData,
): Promise<GroundState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };
  if (!publicStorageConfigured()) return { error: "R2 is not configured." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("league_settings").select("id").limit(1).maybeSingle();
  if (!existing) return { error: "League settings row is missing." };

  const patch: TablesUpdate<"league_settings"> = {};

  const video = formData.get("video");
  if (video instanceof File && video.size > 0) {
    if (video.type !== "video/mp4") return { error: "Hero video must be an MP4." };
    if (video.size > HERO_VIDEO_MAX_BYTES) return { error: "Hero video must be under 3 MB." };
    const key = `ground/hero/${crypto.randomUUID()}.mp4`;
    try {
      await uploadPublicObject({
        key,
        bytes: new Uint8Array(await video.arrayBuffer()),
        contentType: "video/mp4",
      });
    } catch {
      return { error: "Video upload failed." };
    }
    patch.hero_video_r2_key = key;
  }

  const poster = formData.get("poster");
  if (poster instanceof File && poster.size > 0) {
    const parsed = await fileBytes(poster, HERO_POSTER_MAX_BYTES, [
      "image/webp",
      "image/jpeg",
      "image/png",
    ]);
    if ("error" in parsed) return { error: parsed.error };
    const ext = IMG_EXT[parsed.type] ?? "webp";
    const key = `ground/hero/${crypto.randomUUID()}.${ext}`;
    try {
      await uploadPublicObject({ key, bytes: parsed.bytes, contentType: parsed.type });
    } catch {
      return { error: "Poster upload failed." };
    }
    patch.hero_poster_r2_key = key;
  }

  if (Object.keys(patch).length === 0) return { error: "Choose a file to upload." };
  const { error } = await supabase.from("league_settings").update(patch).eq("id", existing.id);
  if (error) return { error: "Could not save the hero media." };
  revalidatePublic();
  return { ok: true };
}
