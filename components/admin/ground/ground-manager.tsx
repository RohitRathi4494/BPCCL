"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Star,
  Film,
  CheckCircle2,
} from "lucide-react";
import { compressImage } from "@/lib/images/compress";
import {
  uploadGroundPhoto,
  updateGroundMedia,
  setMediaConsent,
  setMediaVisibility,
  reorderMedia,
  deleteGroundMedia,
  previewYouTube,
  addGroundVideo,
  recheckVideos,
  uploadClientLogo,
  saveClient,
  setClientPermission,
  setClientVisibility,
  reorderClients,
  deleteClient,
  saveFact,
  setFactVisibility,
  reorderFacts,
  deleteFact,
  saveFaq,
  setFaqVisibility,
  reorderFaqs,
  deleteFaq,
  updateGroundSettings,
  uploadHeroMedia,
  type VideoPreview,
} from "@/app/admin/(protected)/ground/actions";
import {
  ActionButton,
  Panel,
  SortableList,
  StatusLine,
  fieldClass,
  labelClass,
  useGroundAction,
} from "@/components/admin/ground/shared";

// ---------------------------------------------------------------------------
// View types (plain serialisable shapes the server page builds).
// ---------------------------------------------------------------------------
export type PhotoView = {
  id: string;
  section: "ground" | "testimonial";
  title: string | null;
  caption: string | null;
  alt: string | null;
  url: string;
  isFeatured: boolean;
  isVisible: boolean;
  consent: boolean;
};
export type VideoView = {
  id: string;
  section: "ground" | "testimonial";
  youtubeId: string;
  format: "video" | "short";
  title: string | null;
  personName: string | null;
  personRole: string | null;
  quote: string | null;
  poster: string;
  isFeatured: boolean;
  isVisible: boolean;
  consent: boolean;
};
export type ClientView = {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  category: string | null;
  isVisible: boolean;
  permission: boolean;
};
export type FactView = {
  id: string;
  label: string;
  value: string | null;
  icon: string | null;
  isVisible: boolean;
};
export type FaqView = {
  id: string;
  question: string;
  answer: string;
  isVisible: boolean;
};
export type GroundInfo = {
  ground_name: string;
  ground_tagline: string;
  ground_address: string;
  ground_map_url: string;
  ground_lat: string;
  ground_lng: string;
  ground_whatsapp: string;
  youtube_channel_url: string;
  stat_clients: string;
  stat_years: string;
  stat_matches_hosted: string;
  min_age: string;
  senior_age: string;
  heroVideoUrl: string | null;
  heroPosterUrl: string | null;
};

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "videos", label: "Videos" },
  { key: "clients", label: "Clients" },
  { key: "facts", label: "Ground info" },
  { key: "faqs", label: "FAQ" },
  { key: "settings", label: "Settings & hero" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function GroundManager(props: {
  photos: PhotoView[];
  videos: VideoView[];
  clients: ClientView[];
  facts: FactView[];
  faqs: FaqView[];
  info: GroundInfo;
  r2Configured: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("photos");

  return (
    <div className="flex flex-col gap-5">
      {!props.r2Configured && (
        <p className="rounded-md border border-[var(--closed)]/40 bg-[var(--closed)]/5 px-4 py-3 text-sm text-[var(--closed)]">
          Cloudflare R2 public storage isn&apos;t configured — photo, logo and hero uploads will
          fail until the R2 env vars are set.
        </p>
      )}

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "rounded-t-sm px-4 py-2 text-sm transition-colors " +
              (tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/70 hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" && <PhotosPanel photos={props.photos} />}
      {tab === "videos" && <VideosPanel videos={props.videos} />}
      {tab === "clients" && <ClientsPanel clients={props.clients} />}
      {tab === "facts" && <FactsPanel facts={props.facts} />}
      {tab === "faqs" && <FaqsPanel faqs={props.faqs} />}
      {tab === "settings" && <SettingsPanel info={props.info} />}
    </div>
  );
}

function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

// =============================================================================
// PHOTOS
// =============================================================================
function PhotosPanel({ photos }: { photos: PhotoView[] }) {
  const refresh = useRefresh();
  const [section, setSection] = useState<"ground" | "testimonial">("ground");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { blob, type } = await compressImage(file, { maxEdge: 1600, targetBytes: 250_000 });
        const fd = new FormData();
        fd.append("file", blob, `photo.${type === "image/webp" ? "webp" : "jpg"}`);
        fd.append("section", section);
        const res = await uploadGroundPhoto(fd);
        if (res.error) {
          setError(res.error);
          break;
        }
      }
      refresh();
    } catch {
      setError("Couldn't process one of those images.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Panel
      title="Photos"
      description="Drag in JPG/PNG images — they're compressed in your browser and uploaded as hidden drafts. Add alt text, confirm consent, then publish."
    >
      <div className="mb-5 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className={labelClass}>Section</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as "ground" | "testimonial")}
            className="rounded-sm border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="ground">Ground / facilities</option>
            <option value="testimonial">Testimonial</option>
          </select>
        </label>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-4 py-8 text-center"
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <Upload className="size-6 text-muted-foreground/60" />
          )}
          <p className="text-sm text-muted-foreground">
            Drag photos here, or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-primary underline"
            >
              choose files
            </button>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
        {error && <p className="text-xs text-[var(--closed)]">{error}</p>}
      </div>

      <ReorderableMedia items={photos} refresh={refresh} kind="photo" />
    </Panel>
  );
}

// Shared reorder wrapper for media (photos share list; videos use their own row)
function ReorderableMedia({
  items,
  refresh,
  kind,
}: {
  items: PhotoView[];
  refresh: () => void;
  kind: "photo";
}) {
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderMedia(fd);
      refresh();
    });
  }
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">No photos yet.</p>;
  void kind;
  return (
    <SortableList
      items={items}
      pending={pending}
      onReorder={onReorder}
      renderItem={(p) => <PhotoRow photo={p} refresh={refresh} />}
    />
  );
}

function PhotoRow({ photo, refresh }: { photo: PhotoView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({
    title: photo.title ?? "",
    caption: photo.caption ?? "",
    alt_text: photo.alt ?? "",
    section: photo.section,
    is_featured: photo.isFeatured,
  });
  const canPublish = photo.consent && form.alt_text.trim().length > 0;

  function save() {
    const fd = new FormData();
    fd.append("id", photo.id);
    fd.append("title", form.title);
    fd.append("caption", form.caption);
    fd.append("alt_text", form.alt_text);
    fd.append("section", form.section);
    if (form.is_featured) fd.append("is_featured", "on");
    run(updateGroundMedia, fd, refresh);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt ?? ""}
        className="h-24 w-32 shrink-0 rounded-sm object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title (optional)"
          className={fieldClass}
        />
        <input
          value={form.alt_text}
          onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
          placeholder="Alt text (required to publish)"
          className={fieldClass}
        />
        <input
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
          placeholder="Caption (optional)"
          className={fieldClass}
        />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value as "ground" | "testimonial" })}
            className="rounded-sm border border-input bg-background px-2 py-1"
          >
            <option value="ground">Ground</option>
            <option value="testimonial">Testimonial</option>
          </select>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            <Star className="size-3" /> Featured
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ActionButton
            action={setMediaConsent}
            fields={{ id: photo.id, consent_confirmed: (!photo.consent).toString() }}
            onDone={refresh}
            className={
              "inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " +
              (photo.consent
                ? "border-primary/50 text-primary"
                : "border-input text-foreground hover:border-primary")
            }
          >
            <CheckCircle2 className="size-3" /> {photo.consent ? "Consent confirmed" : "Confirm consent"}
          </ActionButton>
          <ActionButton
            action={setMediaVisibility}
            fields={{ id: photo.id, is_visible: (!photo.isVisible).toString() }}
            onDone={refresh}
            disabled={!photo.isVisible && !canPublish}
            title={!photo.isVisible && !canPublish ? "Confirm consent and add alt text first" : undefined}
            className={
              "inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " +
              (photo.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")
            }
          >
            {photo.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            {photo.isVisible ? "Visible" : "Hidden"}
          </ActionButton>
          <ActionButton
            action={deleteGroundMedia}
            fields={{ id: photo.id }}
            confirm="Delete this photo? This also removes it from storage."
            onDone={refresh}
            className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-[var(--closed)] hover:border-[var(--closed)]"
          >
            <Trash2 className="size-3" /> Delete
          </ActionButton>
        </div>
        <StatusLine status={status} />
      </div>
    </div>
  );
}

// =============================================================================
// VIDEOS
// =============================================================================
function VideosPanel({ videos }: { videos: VideoView[] }) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();

  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderMedia(fd);
      refresh();
    });
  }

  return (
    <Panel
      title="Videos"
      description="Hand-pick YouTube videos (max 10 visible per section). Paste any YouTube link — we verify it's embeddable before saving."
      action={
        <ActionButton
          action={async () => recheckVideos()}
          fields={{}}
          onDone={(r) => {
            if (r.message) window.alert(r.message);
            refresh();
          }}
          className="inline-flex items-center gap-1 rounded-sm border border-input px-3 py-1.5 text-xs hover:border-primary"
        >
          Check videos
        </ActionButton>
      }
    >
      <AddVideoForm refresh={refresh} />
      {videos.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No videos yet.</p>
      ) : (
        <div className="mt-5">
          <SortableList
            items={videos}
            pending={pending}
            onReorder={onReorder}
            renderItem={(v) => <VideoRow video={v} refresh={refresh} />}
          />
        </div>
      )}
    </Panel>
  );
}

function AddVideoForm({ refresh }: { refresh: () => void }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Extract<VideoPreview, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();
  const [fields, setFields] = useState({
    section: "testimonial",
    person_name: "",
    person_role: "",
    quote: "",
    is_featured: false,
    consent_confirmed: false,
  });

  function doPreview() {
    setError(null);
    setPreview(null);
    const fd = new FormData();
    fd.append("url", url);
    startCheck(async () => {
      const res = await previewYouTube(fd);
      if (res.ok) setPreview(res);
      else setError(res.error);
    });
  }

  function doAdd() {
    if (!preview) return;
    setError(null);
    const fd = new FormData();
    fd.append("url", url);
    fd.append("title", preview.title);
    fd.append("video_format", preview.format);
    fd.append("section", fields.section);
    fd.append("person_name", fields.person_name);
    fd.append("person_role", fields.person_role);
    fd.append("quote", fields.quote);
    if (fields.is_featured) fd.append("is_featured", "on");
    if (fields.consent_confirmed) fd.append("consent_confirmed", "on");
    startSave(async () => {
      const res = await addGroundVideo(fd);
      if (res.error) setError(res.error);
      else {
        setUrl("");
        setPreview(null);
        setFields({ section: "testimonial", person_name: "", person_role: "", quote: "", is_featured: false, consent_confirmed: false });
        refresh();
      }
    });
  }

  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube link (watch, youtu.be, shorts, embed…)"
          className={fieldClass}
        />
        <button
          type="button"
          onClick={doPreview}
          disabled={checking || !url.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-input px-3 py-2 text-sm hover:border-primary disabled:opacity-50"
        >
          {checking && <Loader2 className="size-3.5 animate-spin" />} Preview
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--closed)]">{error}</p>}

      {preview && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.poster} alt="" className="h-28 w-48 shrink-0 rounded-sm object-cover" />
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-sm font-medium">{preview.title}</p>
            <p className="text-xs text-muted-foreground">
              Detected as a {preview.format === "short" ? "Short (9:16)" : "normal video (16:9)"}.
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <select
                value={fields.section}
                onChange={(e) => setFields({ ...fields, section: e.target.value })}
                className={fieldClass}
              >
                <option value="testimonial">Testimonial (player feedback)</option>
                <option value="ground">Ground (training / facility clip)</option>
              </select>
              <input
                value={fields.person_name}
                onChange={(e) => setFields({ ...fields, person_name: e.target.value })}
                placeholder="Person name"
                className={fieldClass}
              />
              <input
                value={fields.person_role}
                onChange={(e) => setFields({ ...fields, person_role: e.target.value })}
                placeholder="Person role (e.g. Former international, South Africa)"
                className={fieldClass}
              />
              <input
                value={fields.quote}
                maxLength={140}
                onChange={(e) => setFields({ ...fields, quote: e.target.value })}
                placeholder="Short quote (≤140 chars)"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={fields.is_featured} onChange={(e) => setFields({ ...fields, is_featured: e.target.checked })} /> Featured
              </label>
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={fields.consent_confirmed} onChange={(e) => setFields({ ...fields, consent_confirmed: e.target.checked })} /> Consent confirmed
              </label>
              <button
                type="button"
                onClick={doAdd}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />} Add video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoRow({ video, refresh }: { video: VideoView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({
    title: video.title ?? "",
    person_name: video.personName ?? "",
    person_role: video.personRole ?? "",
    quote: video.quote ?? "",
    section: video.section,
    video_format: video.format,
    is_featured: video.isFeatured,
  });

  function save() {
    const fd = new FormData();
    fd.append("id", video.id);
    fd.append("title", form.title);
    fd.append("person_name", form.person_name);
    fd.append("person_role", form.person_role);
    fd.append("quote", form.quote);
    fd.append("section", form.section);
    fd.append("video_format", form.video_format);
    if (form.is_featured) fd.append("is_featured", "on");
    run(updateGroundMedia, fd, refresh);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative h-24 w-40 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.poster} alt="" className="h-full w-full rounded-sm object-cover" />
        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          <Film className="size-3" /> {video.format === "short" ? "Short" : "Video"}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={fieldClass} />
        <div className="grid gap-1.5 sm:grid-cols-2">
          <input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="Person name" className={fieldClass} />
          <input value={form.person_role} onChange={(e) => setForm({ ...form, person_role: e.target.value })} placeholder="Person role" className={fieldClass} />
        </div>
        <input value={form.quote} maxLength={140} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="Quote (≤140)" className={fieldClass} />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as "ground" | "testimonial" })} className="rounded-sm border border-input bg-background px-2 py-1">
            <option value="testimonial">Testimonial</option>
            <option value="ground">Ground</option>
          </select>
          <select value={form.video_format} onChange={(e) => setForm({ ...form, video_format: e.target.value as "video" | "short" })} className="rounded-sm border border-input bg-background px-2 py-1">
            <option value="video">Video (16:9)</option>
            <option value="short">Short (9:16)</option>
          </select>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> <Star className="size-3" /> Featured
          </label>
          <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ActionButton
            action={setMediaConsent}
            fields={{ id: video.id, consent_confirmed: (!video.consent).toString() }}
            onDone={refresh}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (video.consent ? "border-primary/50 text-primary" : "border-input hover:border-primary")}
          >
            <CheckCircle2 className="size-3" /> {video.consent ? "Consent confirmed" : "Confirm consent"}
          </ActionButton>
          <ActionButton
            action={setMediaVisibility}
            fields={{ id: video.id, is_visible: (!video.isVisible).toString() }}
            onDone={refresh}
            disabled={!video.isVisible && !video.consent}
            title={!video.isVisible && !video.consent ? "Confirm consent first" : undefined}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " + (video.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}
          >
            {video.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {video.isVisible ? "Visible" : "Hidden"}
          </ActionButton>
          <ActionButton
            action={deleteGroundMedia}
            fields={{ id: video.id }}
            confirm="Remove this video?"
            onDone={refresh}
            className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-[var(--closed)] hover:border-[var(--closed)]"
          >
            <Trash2 className="size-3" /> Delete
          </ActionButton>
        </div>
        <StatusLine status={status} />
      </div>
    </div>
  );
}

// =============================================================================
// CLIENTS
// =============================================================================
function ClientsPanel({ clients }: { clients: ClientView[] }) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderClients(fd);
      refresh();
    });
  }
  return (
    <Panel title="Clients" description="Logos for the “Trusted by” wall. Only publish logos you have permission to display.">
      <AddClientForm refresh={refresh} />
      {clients.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No clients yet.</p>
      ) : (
        <div className="mt-5">
          <SortableList items={clients} pending={pending} onReorder={onReorder} renderItem={(c) => <ClientRow client={c} refresh={refresh} />} />
        </div>
      )}
    </Panel>
  );
}

function LogoUploadButton({ onUploaded }: { onUploaded: (key: string, url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-xs hover:border-primary disabled:opacity-50">
        {busy ? <Loader2 className="size-3 animate-spin" /> : <ImageIcon className="size-3" />} Upload logo
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/svg+xml,image/png"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setErr(null);
          setBusy(true);
          const fd = new FormData();
          fd.append("file", f);
          const res = await uploadClientLogo(fd);
          setBusy(false);
          if (res.error || !res.key || !res.url) setErr(res.error ?? "Upload failed.");
          else onUploaded(res.key, res.url);
          if (ref.current) ref.current.value = "";
        }}
      />
      {err && <span className="text-[10px] text-[var(--closed)]">{err}</span>}
    </div>
  );
}

function AddClientForm({ refresh }: { refresh: () => void }) {
  const [form, setForm] = useState({ name: "", website_url: "", category: "", logo_r2_key: "", logoUrl: "" });
  const [saving, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function add() {
    if (!form.name.trim()) {
      setErr("Enter the client name.");
      return;
    }
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("website_url", form.website_url);
    fd.append("category", form.category);
    fd.append("logo_r2_key", form.logo_r2_key);
    start(async () => {
      const res = await saveClient(fd);
      if (res.error) setErr(res.error);
      else {
        setForm({ name: "", website_url: "", category: "", logo_r2_key: "", logoUrl: "" });
        refresh();
      }
    });
  }
  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client name" className={fieldClass} />
        <input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="Website URL (optional)" className={fieldClass} />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (optional)" className={fieldClass} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        {form.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ (
          <img src={form.logoUrl} alt="" className="h-8 w-auto" />
        )}
        <LogoUploadButton onUploaded={(key, url) => setForm({ ...form, logo_r2_key: key, logoUrl: url })} />
        <button type="button" onClick={add} disabled={saving} className="ml-auto inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} Add client
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-[var(--closed)]">{err}</p>}
    </div>
  );
}

function ClientRow({ client, refresh }: { client: ClientView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({ name: client.name, website_url: client.website ?? "", category: client.category ?? "" });
  function save() {
    const fd = new FormData();
    fd.append("id", client.id);
    fd.append("name", form.name);
    fd.append("website_url", form.website_url);
    fd.append("category", form.category);
    run(saveClient, fd, refresh);
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="grid size-16 shrink-0 place-items-center rounded-sm border border-border bg-white p-1">
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="grid gap-1.5 sm:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
          <input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="Website" className={fieldClass} />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className={fieldClass} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <ActionButton action={setClientPermission} fields={{ id: client.id, permission_confirmed: (!client.permission).toString() }} onDone={refresh}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (client.permission ? "border-primary/50 text-primary" : "border-input hover:border-primary")}>
            <CheckCircle2 className="size-3" /> {client.permission ? "Permission confirmed" : "Confirm permission"}
          </ActionButton>
          <ActionButton action={setClientVisibility} fields={{ id: client.id, is_visible: (!client.isVisible).toString() }} onDone={refresh}
            disabled={!client.isVisible && !client.permission}
            title={!client.isVisible && !client.permission ? "Confirm permission first" : undefined}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " + (client.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}>
            {client.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {client.isVisible ? "Visible" : "Hidden"}
          </ActionButton>
          <ActionButton action={deleteClient} fields={{ id: client.id }} confirm="Delete this client?" onDone={refresh}
            className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-[var(--closed)] hover:border-[var(--closed)]">
            <Trash2 className="size-3" /> Delete
          </ActionButton>
        </div>
        <StatusLine status={status} />
      </div>
    </div>
  );
}

// =============================================================================
// FACTS
// =============================================================================
function FactsPanel({ facts }: { facts: FactView[] }) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderFacts(fd);
      refresh();
    });
  }
  return (
    <Panel title="Ground facts" description="Icon + value + label chips (e.g. “Floodlit turf pitches”, “4”). Icon is an emoji or a lucide icon name.">
      <AddFactForm refresh={refresh} />
      {facts.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No facts yet.</p>
      ) : (
        <div className="mt-5">
          <SortableList items={facts} pending={pending} onReorder={onReorder} renderItem={(f) => <FactRow fact={f} refresh={refresh} />} />
        </div>
      )}
    </Panel>
  );
}

function AddFactForm({ refresh }: { refresh: () => void }) {
  const [form, setForm] = useState({ icon: "", value: "", label: "" });
  const [saving, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function add() {
    if (!form.label.trim()) {
      setErr("Enter a label.");
      return;
    }
    const fd = new FormData();
    fd.append("icon", form.icon);
    fd.append("value", form.value);
    fd.append("label", form.label);
    start(async () => {
      const res = await saveFact(fd);
      if (res.error) setErr(res.error);
      else {
        setForm({ icon: "", value: "", label: "" });
        refresh();
      }
    });
  }
  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <div className="grid gap-2 sm:grid-cols-[6rem_8rem_1fr_auto]">
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icon" className={fieldClass} />
        <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value" className={fieldClass} />
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label" className={fieldClass} />
        <button type="button" onClick={add} disabled={saving} className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} Add
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-[var(--closed)]">{err}</p>}
    </div>
  );
}

function FactRow({ fact, refresh }: { fact: FactView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({ icon: fact.icon ?? "", value: fact.value ?? "", label: fact.label });
  function save() {
    const fd = new FormData();
    fd.append("id", fact.id);
    fd.append("icon", form.icon);
    fd.append("value", form.value);
    fd.append("label", form.label);
    run(saveFact, fd, refresh);
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-1.5 sm:grid-cols-[6rem_8rem_1fr]">
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icon" className={fieldClass} />
        <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value" className={fieldClass} />
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label" className={fieldClass} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <ActionButton action={setFactVisibility} fields={{ id: fact.id, is_visible: (!fact.isVisible).toString() }} onDone={refresh}
          className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (fact.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}>
          {fact.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {fact.isVisible ? "Visible" : "Hidden"}
        </ActionButton>
        <ActionButton action={deleteFact} fields={{ id: fact.id }} confirm="Delete this fact?" onDone={refresh}
          className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-[var(--closed)] hover:border-[var(--closed)]">
          <Trash2 className="size-3" /> Delete
        </ActionButton>
      </div>
      <StatusLine status={status} />
    </div>
  );
}

// =============================================================================
// FAQs
// =============================================================================
function FaqsPanel({ faqs }: { faqs: FaqView[] }) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderFaqs(fd);
      refresh();
    });
  }
  return (
    <Panel
      title="FAQ"
      description="Shown on the home page. Tokens: {{age_rule}} (eligibility), {{fee}} / {{fee_clause}} (fee) resolve from league settings — so ₹0 is never shown."
    >
      <AddFaqForm refresh={refresh} />
      {faqs.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No FAQs yet.</p>
      ) : (
        <div className="mt-5">
          <SortableList items={faqs} pending={pending} onReorder={onReorder} renderItem={(f) => <FaqRow faq={f} refresh={refresh} />} />
        </div>
      )}
    </Panel>
  );
}

function AddFaqForm({ refresh }: { refresh: () => void }) {
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function add() {
    if (!form.question.trim()) {
      setErr("Enter the question.");
      return;
    }
    const fd = new FormData();
    fd.append("question", form.question);
    fd.append("answer", form.answer);
    start(async () => {
      const res = await saveFaq(fd);
      if (res.error) setErr(res.error);
      else {
        setForm({ question: "", answer: "" });
        refresh();
      }
    });
  }
  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" className={fieldClass} />
      <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Answer" rows={2} className={fieldClass + " mt-2"} />
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={add} disabled={saving} className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} Add FAQ
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-[var(--closed)]">{err}</p>}
    </div>
  );
}

function FaqRow({ faq, refresh }: { faq: FaqView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({ question: faq.question, answer: faq.answer });
  const canPublish = form.answer.trim().length > 0;
  function save() {
    const fd = new FormData();
    fd.append("id", faq.id);
    fd.append("question", form.question);
    fd.append("answer", form.answer);
    run(saveFaq, fd, refresh);
  }
  return (
    <div className="flex flex-col gap-1.5">
      <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className={fieldClass} />
      <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={2} className={fieldClass} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <ActionButton action={setFaqVisibility} fields={{ id: faq.id, is_visible: (!faq.isVisible).toString() }} onDone={refresh}
          disabled={!faq.isVisible && !canPublish}
          title={!faq.isVisible && !canPublish ? "Add an answer first" : undefined}
          className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " + (faq.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}>
          {faq.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {faq.isVisible ? "Visible" : "Hidden"}
        </ActionButton>
        <ActionButton action={deleteFaq} fields={{ id: faq.id }} confirm="Delete this FAQ?" onDone={refresh}
          className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-[var(--closed)] hover:border-[var(--closed)]">
          <Trash2 className="size-3" /> Delete
        </ActionButton>
      </div>
      <StatusLine status={status} />
    </div>
  );
}

// =============================================================================
// SETTINGS + HERO
// =============================================================================
function SettingsPanel({ info }: { info: GroundInfo }) {
  const refresh = useRefresh();
  const { pending, status, run } = useGroundAction();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(updateGroundSettings, new FormData(e.currentTarget), refresh);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Ground & trust settings" description="Powers the home sections, the /ballpark page and SEO.">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Ground name"><input name="ground_name" defaultValue={info.ground_name} className={fieldClass} /></Labeled>
          <Labeled label="Ground tagline"><input name="ground_tagline" defaultValue={info.ground_tagline} className={fieldClass} /></Labeled>
          <Labeled label="Address" className="sm:col-span-2"><input name="ground_address" defaultValue={info.ground_address} className={fieldClass} /></Labeled>
          <Labeled label="Google Maps link (Get directions)"><input name="ground_map_url" defaultValue={info.ground_map_url} className={fieldClass} /></Labeled>
          <Labeled label="YouTube channel URL"><input name="youtube_channel_url" defaultValue={info.youtube_channel_url} className={fieldClass} /></Labeled>
          <Labeled label="Latitude"><input name="ground_lat" defaultValue={info.ground_lat} className={fieldClass} /></Labeled>
          <Labeled label="Longitude"><input name="ground_lng" defaultValue={info.ground_lng} className={fieldClass} /></Labeled>
          <Labeled label="Booking WhatsApp (wa.me/… or number)" className="sm:col-span-2"><input name="ground_whatsapp" defaultValue={info.ground_whatsapp} className={fieldClass} /></Labeled>
          <Labeled label="Stat: clients"><input name="stat_clients" defaultValue={info.stat_clients} inputMode="numeric" className={fieldClass} /></Labeled>
          <Labeled label="Stat: years"><input name="stat_years" defaultValue={info.stat_years} inputMode="numeric" className={fieldClass} /></Labeled>
          <Labeled label="Stat: matches hosted"><input name="stat_matches_hosted" defaultValue={info.stat_matches_hosted} inputMode="numeric" className={fieldClass} /></Labeled>
          <Labeled label="Registration min age"><input name="min_age" defaultValue={info.min_age} inputMode="numeric" className={fieldClass} /></Labeled>
          <Labeled label="Senior / eligibility age"><input name="senior_age" defaultValue={info.senior_age} inputMode="numeric" className={fieldClass} /></Labeled>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1 rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {pending && <Loader2 className="size-3.5 animate-spin" />} Save settings
            </button>
            <StatusLine status={status} />
          </div>
        </form>
      </Panel>

      <HeroMediaPanel info={info} />
    </div>
  );
}

function HeroMediaPanel({ info }: { info: GroundInfo }) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    start(async () => {
      const res = await uploadHeroMedia(new FormData(form));
      if (res.error) setErr(res.error);
      else {
        form.reset();
        refresh();
      }
    });
  }
  return (
    <Panel title="Hero loop (/ballpark)" description="A short muted MP4 (6–10 s, ≤3 MB) + poster image. The poster shows on reduced-motion / Save-Data.">
      <div className="mb-4 flex flex-wrap gap-6 text-xs text-muted-foreground">
        <div>
          Current video:{" "}
          {info.heroVideoUrl ? (
            <a href={info.heroVideoUrl} target="_blank" rel="noreferrer" className="text-primary underline">set</a>
          ) : (
            "none"
          )}
        </div>
        <div className="flex items-center gap-2">
          Current poster:{" "}
          {info.heroPosterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.heroPosterUrl} alt="" className="h-10 w-auto rounded-sm" />
          ) : (
            "none"
          )}
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Labeled label="Hero video (MP4, ≤3 MB)"><input type="file" name="video" accept="video/mp4" className="text-sm" /></Labeled>
        <Labeled label="Hero poster (JPG/PNG/WebP)"><input type="file" name="poster" accept="image/*" className="text-sm" /></Labeled>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-1 rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {pending && <Loader2 className="size-3.5 animate-spin" />} Upload hero media
          </button>
          {err && <p className="text-xs text-[var(--closed)]">{err}</p>}
        </div>
      </form>
    </Panel>
  );
}

function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"flex flex-col gap-1 " + (className ?? "")}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
