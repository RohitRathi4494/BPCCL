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
  uploadClientLogo,
  saveClient,
  setClientPermission,
  setClientVisibility,
  reorderClients,
  deleteClient,
} from "@/app/admin/(protected)/ground/actions";
import {
  previewReel,
  uploadReelPoster,
  addReel,
  updateReel,
  setReelPermission,
  setReelVisibility,
  reorderReels,
  deleteReel,
  recheckReels,
  updateShowcaseSettings,
} from "@/app/admin/(protected)/showcase/actions";
import {
  MAX_VISIBLE_REELS,
  REEL_QUOTE_MAX,
  type ReelPreview,
} from "@/app/admin/(protected)/showcase/types";
import {
  ActionButton,
  Panel,
  SortableList,
  StatusLine,
  fieldClass,
  useGroundAction,
} from "@/components/admin/ground/shared";

// ---------------------------------------------------------------------------
// View types (plain serialisable shapes the server page builds).
// ---------------------------------------------------------------------------
export type PhotoView = {
  id: string;
  title: string | null;
  caption: string | null;
  alt: string | null;
  url: string;
  isFeatured: boolean;
  isVisible: boolean;
  consent: boolean;
};
export type ReelView = {
  id: string;
  youtubeId: string;
  format: "video" | "short";
  title: string | null;
  personName: string;
  personRole: string | null;
  quote: string | null;
  durationLabel: string | null;
  hasCustomPoster: boolean;
  poster: string;
  isVisible: boolean;
  permission: boolean;
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
export type ShowcaseSettingsView = {
  youtubeChannelUrl: string;
};

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "reels", label: "Reels" },
  { key: "clients", label: "Clients" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function GroundManager(props: {
  photos: PhotoView[];
  reels: ReelView[];
  clients: ClientView[];
  settings: ShowcaseSettingsView;
  visibleReels: number;
  r2Configured: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("photos");

  return (
    <div className="flex flex-col gap-5">
      {!props.r2Configured && (
        <p className="rounded-md border border-[var(--closed)]/40 bg-[var(--closed)]/5 px-4 py-3 text-sm text-[var(--closed)]">
          Cloudflare R2 public storage isn&apos;t configured — photo and logo uploads will fail
          until the R2 env vars are set.
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
      {tab === "reels" && (
        <ReelsPanel
          reels={props.reels}
          visibleReels={props.visibleReels}
          channelUrl={props.settings.youtubeChannelUrl}
        />
      )}
      {tab === "clients" && <ClientsPanel clients={props.clients} />}
    </div>
  );
}

function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

// =============================================================================
// Reusable image upload (shows a cropped preview at the given aspect ratio).
// =============================================================================
function ImageUpload({
  aspect,
  previewUrl,
  action,
  onUploaded,
  label,
  maxEdge,
  targetBytes,
}: {
  aspect: string; // e.g. "9 / 16"
  previewUrl: string | null;
  action: (fd: FormData) => Promise<{ key?: string; url?: string; error?: string }>;
  onUploaded: (key: string, url: string) => void;
  label: string;
  maxEdge: number;
  targetBytes: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const { blob, type } = await compressImage(file, { maxEdge, targetBytes });
      const fd = new FormData();
      fd.append("file", blob, `img.${type === "image/webp" ? "webp" : "jpg"}`);
      const res = await action(fd);
      if (res.error || !res.key || !res.url) setErr(res.error ?? "Upload failed.");
      else onUploaded(res.key, res.url);
    } catch {
      setErr("Couldn't process that image.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className="relative w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
        style={{ aspectRatio: aspect }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground/50">
            <Upload className="size-5" />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-background/60">
            <Loader2 className="size-5 animate-spin text-primary" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-xs hover:border-primary disabled:opacity-50"
        >
          <Upload className="size-3" /> {label}
        </button>
        <span className="text-[10px] text-muted-foreground">Cropped to {aspect.replace(/ /g, "")}.</span>
        {err && <span className="text-[10px] text-[var(--closed)]">{err}</span>}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
      </div>
    </div>
  );
}

// =============================================================================
// PHOTOS — one gallery (ground shots + legends/stars at the ground). Shown on
// the home page and /ballpark. No section split: every photo is one gallery.
// =============================================================================
function PhotosPanel({ photos }: { photos: PhotoView[] }) {
  const refresh = useRefresh();
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
      description="The ground gallery — facilities, match days and the stars who've played here. Drag in JPG/PNG images; they're compressed in your browser and uploaded as hidden drafts. Add alt text, confirm consent, then publish. Shown on the home page and /ballpark."
    >
      <div className="mb-5 flex flex-col gap-3">
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

      <ReorderablePhotos items={photos} refresh={refresh} />
    </Panel>
  );
}

function ReorderablePhotos({ items, refresh }: { items: PhotoView[]; refresh: () => void }) {
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderMedia(fd);
      refresh();
    });
  }
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No photos yet.</p>;
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
    is_featured: photo.isFeatured,
  });
  const canPublish = photo.consent && form.alt_text.trim().length > 0;

  function save() {
    const fd = new FormData();
    fd.append("id", photo.id);
    fd.append("title", form.title);
    fd.append("caption", form.caption);
    fd.append("alt_text", form.alt_text);
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
// REELS — short YouTube clips from people who play at Ballpark. Shown on the
// home page and /ballpark.
// =============================================================================
function ReelsPanel({
  reels,
  visibleReels,
  channelUrl,
}: {
  reels: ReelView[];
  visibleReels: number;
  channelUrl: string;
}) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderReels(fd);
      refresh();
    });
  }
  const atCap = visibleReels >= MAX_VISIBLE_REELS;
  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Reels"
        description={`Short YouTube clips from the people who play at Ballpark. Paste any YouTube link — we verify it's embeddable before saving. Up to ${MAX_VISIBLE_REELS} can be visible (${visibleReels} now).`}
        action={
          <ActionButton
            action={async () => recheckReels()}
            fields={{}}
            onDone={(r) => {
              if (r.message) window.alert(r.message);
              refresh();
            }}
            className="inline-flex items-center gap-1 rounded-sm border border-input px-3 py-1.5 text-xs hover:border-primary"
          >
            Check all videos
          </ActionButton>
        }
      >
        {atCap && (
          <p className="mb-3 rounded-sm border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            You have {MAX_VISIBLE_REELS} reels visible — the maximum. Hide one before publishing another.
          </p>
        )}
        <AddReelForm refresh={refresh} atCap={atCap} />
        {reels.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">No reels yet.</p>
        ) : (
          <div className="mt-5">
            <SortableList
              items={reels}
              pending={pending}
              onReorder={onReorder}
              renderItem={(r) => <ReelRow reel={r} refresh={refresh} atCap={atCap} />}
            />
          </div>
        )}
      </Panel>
      <ChannelUrlPanel channelUrl={channelUrl} refresh={refresh} />
    </div>
  );
}

function AddReelForm({ refresh, atCap }: { refresh: () => void; atCap: boolean }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Extract<ReelPreview, { ok: true }> | null>(null);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [poster, setPoster] = useState<{ key: string; url: string } | null>(null);
  const [fields, setFields] = useState({
    person_name: "",
    person_role: "",
    quote: "",
    duration_label: "",
    video_format: "video" as "video" | "short",
    permission_confirmed: false,
    is_visible: false,
  });

  function doPreview() {
    setErr(null);
    setPreview(null);
    const fd = new FormData();
    fd.append("url", url);
    startCheck(async () => {
      const res = await previewReel(fd);
      if (res.ok) {
        setPreview(res);
        setFields((f) => ({ ...f, video_format: res.format }));
      } else setErr(res.error);
    });
  }

  function doAdd() {
    if (!preview) return;
    setErr(null);
    if (!fields.person_name.trim()) return setErr("Enter the person's name.");
    const fd = new FormData();
    fd.append("url", url);
    fd.append("title", preview.title);
    fd.append("video_format", fields.video_format);
    fd.append("person_name", fields.person_name);
    fd.append("person_role", fields.person_role);
    fd.append("quote", fields.quote);
    fd.append("duration_label", fields.duration_label);
    if (poster) fd.append("custom_poster_r2_key", poster.key);
    if (fields.permission_confirmed) fd.append("permission_confirmed", "on");
    if (fields.is_visible) fd.append("is_visible", "on");
    startSave(async () => {
      const res = await addReel(fd);
      if (res.error) setErr(res.error);
      else {
        setUrl("");
        setPreview(null);
        setPoster(null);
        setFields({ person_name: "", person_role: "", quote: "", duration_label: "", video_format: "video", permission_confirmed: false, is_visible: false });
        refresh();
      }
    });
  }

  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Add a reel</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a YouTube link (watch, youtu.be, shorts, embed…)" className={fieldClass} />
        <button type="button" onClick={doPreview} disabled={checking || !url.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-input px-3 py-2 text-sm hover:border-primary disabled:opacity-50">
          {checking && <Loader2 className="size-3.5 animate-spin" />} Preview
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-[var(--closed)]">{err}</p>}

      {preview && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.poster} alt="" className="h-40 w-28 shrink-0 rounded-sm object-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm font-medium">{preview.title}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <input value={fields.person_name} onChange={(e) => setFields({ ...fields, person_name: e.target.value })} placeholder="Person name (required)" className={fieldClass} />
              <input value={fields.person_role} onChange={(e) => setFields({ ...fields, person_role: e.target.value })} placeholder="Person role" className={fieldClass} />
              <input value={fields.duration_label} onChange={(e) => setFields({ ...fields, duration_label: e.target.value })} placeholder="Duration label (e.g. 0:42)" className={fieldClass} />
              <select value={fields.video_format} onChange={(e) => setFields({ ...fields, video_format: e.target.value as "video" | "short" })} className={fieldClass}>
                <option value="short">Short (9:16)</option>
                <option value="video">Video (16:9)</option>
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <input value={fields.quote} maxLength={REEL_QUOTE_MAX} onChange={(e) => setFields({ ...fields, quote: e.target.value })} placeholder="Short quote (optional)" className={fieldClass} />
              <span className="text-right text-[10px] text-muted-foreground">{fields.quote.length}/{REEL_QUOTE_MAX}</span>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">
                Custom 9:16 poster (recommended — the YouTube thumbnail is landscape)
              </p>
              <ImageUpload
                aspect="9 / 16"
                previewUrl={poster?.url ?? null}
                action={uploadReelPoster}
                onUploaded={(key, url) => setPoster({ key, url })}
                label="Upload poster"
                maxEdge={1080}
                targetBytes={200_000}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={fields.permission_confirmed} onChange={(e) => setFields({ ...fields, permission_confirmed: e.target.checked })} /> Permission confirmed
              </label>
              <label className="inline-flex items-center gap-1" title={atCap ? "You're at the visible-reels cap" : undefined}>
                <input type="checkbox" checked={fields.is_visible} disabled={atCap || !fields.permission_confirmed} onChange={(e) => setFields({ ...fields, is_visible: e.target.checked })} /> Visible now
              </label>
              <button type="button" onClick={doAdd} disabled={saving} className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50">
                {saving && <Loader2 className="size-3.5 animate-spin" />} Add reel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReelRow({ reel, refresh, atCap }: { reel: ReelView; refresh: () => void; atCap: boolean }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({
    title: reel.title ?? "",
    person_name: reel.personName,
    person_role: reel.personRole ?? "",
    quote: reel.quote ?? "",
    duration_label: reel.durationLabel ?? "",
    video_format: reel.format,
  });
  const [newPoster, setNewPoster] = useState<{ key: string; url: string } | null>(null);

  function save() {
    const fd = new FormData();
    fd.append("id", reel.id);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (newPoster) fd.append("custom_poster_r2_key", newPoster.key);
    run(updateReel, fd, refresh);
  }

  const blockVisible = !reel.isVisible && (atCap || !reel.permission);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="relative h-40 w-24 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={newPoster?.url ?? reel.poster} alt="" className="h-full w-full object-cover" />
          <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            <Film className="size-3" /> {reel.format === "short" ? "Short" : "Video"}
          </span>
        </div>
        <ImageUpload
          aspect="9 / 16"
          previewUrl={null}
          action={uploadReelPoster}
          onUploaded={(key, url) => setNewPoster({ key, url })}
          label="Poster"
          maxEdge={1080}
          targetBytes={200_000}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={fieldClass} />
        <div className="grid gap-1.5 sm:grid-cols-2">
          <input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="Person name" className={fieldClass} />
          <input value={form.person_role} onChange={(e) => setForm({ ...form, person_role: e.target.value })} placeholder="Person role" className={fieldClass} />
          <input value={form.duration_label} onChange={(e) => setForm({ ...form, duration_label: e.target.value })} placeholder="Duration (e.g. 0:42)" className={fieldClass} />
          <select value={form.video_format} onChange={(e) => setForm({ ...form, video_format: e.target.value as "video" | "short" })} className="rounded-sm border border-input bg-background px-2 py-1 text-sm">
            <option value="short">Short (9:16)</option>
            <option value="video">Video (16:9)</option>
          </select>
        </div>
        <input value={form.quote} maxLength={REEL_QUOTE_MAX} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder={`Quote ≤${REEL_QUOTE_MAX}`} className={fieldClass} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <ActionButton
            action={setReelPermission}
            fields={{ id: reel.id, permission_confirmed: (!reel.permission).toString() }}
            onDone={refresh}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (reel.permission ? "border-primary/50 text-primary" : "border-input hover:border-primary")}
          >
            <CheckCircle2 className="size-3" /> {reel.permission ? "Permission confirmed" : "Confirm permission"}
          </ActionButton>
          <ActionButton
            action={setReelVisibility}
            fields={{ id: reel.id, is_visible: (!reel.isVisible).toString() }}
            onDone={refresh}
            disabled={blockVisible}
            title={blockVisible ? (atCap ? "At the visible-reels cap — hide one first" : "Confirm permission first") : undefined}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " + (reel.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}
          >
            {reel.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {reel.isVisible ? "Visible" : "Hidden"}
          </ActionButton>
          <ActionButton
            action={deleteReel}
            fields={{ id: reel.id }}
            confirm="Delete this reel?"
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

function ChannelUrlPanel({ channelUrl, refresh }: { channelUrl: string; refresh: () => void }) {
  const [url, setUrl] = useState(channelUrl);
  const [saving, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: boolean } | null>(null);
  function save() {
    setStatus(null);
    const fd = new FormData();
    fd.append("youtube_channel_url", url);
    start(async () => {
      const res = await updateShowcaseSettings(fd);
      setStatus(res);
      if (res.ok) refresh();
    });
  }
  return (
    <Panel
      title="YouTube channel"
      description="Linked under the reels rail as “Watch more on our YouTube channel”. Leave blank to hide the link."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/@yourchannel" className={fieldClass} />
        <button type="button" onClick={save} disabled={saving} className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="size-3.5 animate-spin" />} Save
        </button>
      </div>
      {status?.error && <p className="mt-1 text-xs text-[var(--closed)]">{status.error}</p>}
      {status?.ok && <p className="mt-1 text-xs text-primary">Saved.</p>}
    </Panel>
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
