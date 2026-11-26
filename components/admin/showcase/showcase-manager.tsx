"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  CheckCircle2,
  Upload,
  Film,
  X,
  Plus,
} from "lucide-react";
import { compressImage } from "@/lib/images/compress";
import {
  uploadLegendPhoto,
  saveLegend,
  setLegendFeatured,
  setLegendPermission,
  setLegendVisibility,
  reorderLegends,
  deleteLegend,
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
  LEGEND_QUOTE_MAX,
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
  labelClass,
  useGroundAction,
} from "@/components/admin/ground/shared";

// ---------------------------------------------------------------------------
// View types (serialisable shapes built by the server page).
// ---------------------------------------------------------------------------
export type LegendView = {
  id: string;
  name: string;
  country: string | null;
  teamOrRole: string | null;
  visitType: string | null;
  visitMonth: string; // "yyyy-mm" or ""
  youtubeId: string | null;
  quote: string | null;
  alt: string;
  photoUrl: string;
  permissionNote: string | null;
  isFeatured: boolean;
  isVisible: boolean;
  permission: boolean;
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
export type ShowcaseSettingsView = {
  alsoTrained: string[];
  removalEmail: string;
  youtubeChannelUrl: string;
};

const TABS = [
  { key: "legends", label: "Legends" },
  { key: "reels", label: "Reels" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ShowcaseManager(props: {
  legends: LegendView[];
  reels: ReelView[];
  settings: ShowcaseSettingsView;
  visibleReels: number;
  r2Configured: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("legends");
  return (
    <div className="flex flex-col gap-5">
      {!props.r2Configured && (
        <p className="rounded-md border border-[var(--closed)]/40 bg-[var(--closed)]/5 px-4 py-3 text-sm text-[var(--closed)]">
          Cloudflare R2 public storage isn&apos;t configured — photo uploads will fail until the
          R2 env vars are set.
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
      {tab === "legends" && <LegendsTab legends={props.legends} settings={props.settings} />}
      {tab === "reels" && (
        <ReelsTab
          reels={props.reels}
          visibleReels={props.visibleReels}
          channelUrl={props.settings.youtubeChannelUrl}
        />
      )}
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
  aspect: string; // e.g. "4 / 5" or "9 / 16"
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
// LEGENDS
// =============================================================================
function LegendsTab({
  legends,
  settings,
}: {
  legends: LegendView[];
  settings: ShowcaseSettingsView;
}) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  function onReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("ids", JSON.stringify(ids));
    start(async () => {
      await reorderLegends(fd);
      refresh();
    });
  }
  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Legends"
        description="International / notable players photographed at Ballpark. Upload a 4:5 portrait, fill the factual caption, confirm permission, then publish. One legend can be Featured (the big card)."
      >
        <AddLegendForm refresh={refresh} />
        {legends.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">No legends yet.</p>
        ) : (
          <div className="mt-5">
            <SortableList
              items={legends}
              pending={pending}
              onReorder={onReorder}
              renderItem={(l) => <LegendRow legend={l} refresh={refresh} />}
            />
          </div>
        )}
      </Panel>
      <AlsoTrainedPanel settings={settings} refresh={refresh} />
    </div>
  );
}

const emptyLegend = {
  name: "",
  country: "",
  team_or_role: "",
  visit_type: "",
  visit_month: "",
  youtube_url: "",
  quote: "",
  alt_text: "",
  permission_note: "",
};

function AddLegendForm({ refresh }: { refresh: () => void }) {
  const [form, setForm] = useState(emptyLegend);
  const [photo, setPhoto] = useState<{ key: string; url: string } | null>(null);
  const [saving, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (!photo) return setErr("Upload a portrait photo first.");
    if (!form.name.trim()) return setErr("Enter the player's name.");
    if (!form.alt_text.trim()) return setErr("Add alt text describing the photo.");
    const fd = new FormData();
    fd.append("r2_key", photo.key);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    start(async () => {
      const res = await saveLegend(fd);
      if (res.error) setErr(res.error);
      else {
        setForm(emptyLegend);
        setPhoto(null);
        refresh();
      }
    });
  }

  return (
    <div className="rounded-md border border-dashed border-input p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Add a legend</p>
      <div className="flex flex-col gap-3">
        <ImageUpload
          aspect="4 / 5"
          previewUrl={photo?.url ?? null}
          action={uploadLegendPhoto}
          onUploaded={(key, url) => setPhoto({ key, url })}
          label="Upload portrait"
          maxEdge={1000}
          targetBytes={150_000}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className={fieldClass} />
          <input value={form.country} maxLength={2} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} placeholder="Country code (AU, IN, ZA…)" className={fieldClass} />
          <input value={form.team_or_role} onChange={(e) => setForm({ ...form, team_or_role: e.target.value })} placeholder="Team or role (e.g. Australia · Test squad)" className={fieldClass} />
          <input value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })} placeholder="Visit type (e.g. Net session)" className={fieldClass} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">Visit month</span>
            <input type="month" value={form.visit_month} onChange={(e) => setForm({ ...form, visit_month: e.target.value })} className={fieldClass} />
          </label>
          <input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="YouTube link (optional — enables the quote)" className={fieldClass} />
        </div>
        <input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} placeholder="Alt text (required) — describe the photo" className={fieldClass} />
        <div className="flex flex-col gap-1">
          <input
            value={form.quote}
            maxLength={LEGEND_QUOTE_MAX}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            placeholder="Quote (optional — only shown with a video)"
            className={fieldClass}
          />
          <span className="text-right text-[10px] text-muted-foreground">
            {form.quote.length}/{LEGEND_QUOTE_MAX}
          </span>
        </div>
        <input value={form.permission_note} onChange={(e) => setForm({ ...form, permission_note: e.target.value })} placeholder="Permission note (who gave OK, when)" className={fieldClass} />
        {err && <p className="text-xs text-[var(--closed)]">{err}</p>}
        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="inline-flex w-fit items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />} Add legend
        </button>
      </div>
    </div>
  );
}

function LegendRow({ legend, refresh }: { legend: LegendView; refresh: () => void }) {
  const { pending, status, run } = useGroundAction();
  const [form, setForm] = useState({
    name: legend.name,
    country: legend.country ?? "",
    team_or_role: legend.teamOrRole ?? "",
    visit_type: legend.visitType ?? "",
    visit_month: legend.visitMonth,
    youtube_url: legend.youtubeId ? `https://youtu.be/${legend.youtubeId}` : "",
    quote: legend.quote ?? "",
    alt_text: legend.alt,
    permission_note: legend.permissionNote ?? "",
  });
  const [newPhoto, setNewPhoto] = useState<{ key: string; url: string } | null>(null);
  const canPublish = legend.permission;

  function save() {
    const fd = new FormData();
    fd.append("id", legend.id);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (newPhoto) fd.append("r2_key", newPhoto.key);
    run(saveLegend, fd, refresh);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="relative aspect-[4/5] w-28 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={newPhoto?.url ?? legend.photoUrl} alt={legend.alt} className="h-full w-full object-cover" />
          {legend.isFeatured && (
            <span className="absolute left-1 top-1 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground uppercase">
              Featured
            </span>
          )}
        </div>
        <ImageUpload
          aspect="4 / 5"
          previewUrl={null}
          action={uploadLegendPhoto}
          onUploaded={(key, url) => setNewPhoto({ key, url })}
          label="Replace"
          maxEdge={1000}
          targetBytes={150_000}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="grid gap-1.5 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className={fieldClass} />
          <input value={form.country} maxLength={2} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} placeholder="Country code" className={fieldClass} />
          <input value={form.team_or_role} onChange={(e) => setForm({ ...form, team_or_role: e.target.value })} placeholder="Team or role" className={fieldClass} />
          <input value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })} placeholder="Visit type" className={fieldClass} />
          <input type="month" value={form.visit_month} onChange={(e) => setForm({ ...form, visit_month: e.target.value })} className={fieldClass} />
          <input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="YouTube link (optional)" className={fieldClass} />
        </div>
        <input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} placeholder="Alt text" className={fieldClass} />
        <input value={form.quote} maxLength={LEGEND_QUOTE_MAX} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder={`Quote ≤${LEGEND_QUOTE_MAX} (shown only with a video)`} className={fieldClass} />
        <input value={form.permission_note} onChange={(e) => setForm({ ...form, permission_note: e.target.value })} placeholder="Permission note" className={fieldClass} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={save} disabled={pending} className="rounded-sm border border-input px-2.5 py-1 hover:border-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <ActionButton
            action={setLegendFeatured}
            fields={{ id: legend.id, is_featured: (!legend.isFeatured).toString() }}
            onDone={refresh}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (legend.isFeatured ? "border-primary/50 text-primary" : "border-input hover:border-primary")}
          >
            <Star className="size-3" /> {legend.isFeatured ? "Featured" : "Make featured"}
          </ActionButton>
          <ActionButton
            action={setLegendPermission}
            fields={{ id: legend.id, permission_confirmed: (!legend.permission).toString() }}
            onDone={refresh}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 " + (legend.permission ? "border-primary/50 text-primary" : "border-input hover:border-primary")}
          >
            <CheckCircle2 className="size-3" /> {legend.permission ? "Permission confirmed" : "Confirm permission"}
          </ActionButton>
          <ActionButton
            action={setLegendVisibility}
            fields={{ id: legend.id, is_visible: (!legend.isVisible).toString() }}
            onDone={refresh}
            disabled={!legend.isVisible && !canPublish}
            title={!legend.isVisible && !canPublish ? "Confirm permission first" : undefined}
            className={"inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 disabled:opacity-40 " + (legend.isVisible ? "border-primary bg-primary/10 text-primary" : "border-input")}
          >
            {legend.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {legend.isVisible ? "Visible" : "Hidden"}
          </ActionButton>
          <ActionButton
            action={deleteLegend}
            fields={{ id: legend.id }}
            confirm="Delete this legend? This also removes the photo from storage."
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

function AlsoTrainedPanel({
  settings,
  refresh,
}: {
  settings: ShowcaseSettingsView;
  refresh: () => void;
}) {
  const [chips, setChips] = useState<string[]>(settings.alsoTrained);
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState(settings.removalEmail);
  const [saving, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: boolean } | null>(null);

  function addChip() {
    const v = draft.trim();
    if (v && !chips.includes(v)) setChips([...chips, v]);
    setDraft("");
  }
  function save() {
    setStatus(null);
    const fd = new FormData();
    fd.append("legends_also_trained", JSON.stringify(chips));
    fd.append("removal_contact_email", email);
    start(async () => {
      const res = await updateShowcaseSettings(fd);
      setStatus(res);
      if (res.ok) refresh();
    });
  }

  return (
    <Panel
      title="Also trained here & removal contact"
      description="Extra names shown as a plain list under the legends (for people without a photo), and the email the public can use to request a photo be removed."
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              {c}
              <button type="button" onClick={() => setChips(chips.filter((x) => x !== c))} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-[var(--closed)]">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChip();
              }
            }}
            placeholder="Add a name, press Enter"
            className={fieldClass}
          />
          <button type="button" onClick={addChip} className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-xs hover:border-primary">
            <Plus className="size-3" /> Add
          </button>
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Removal contact email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="removal@example.com" className={fieldClass} />
        </label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {saving && <Loader2 className="size-3.5 animate-spin" />} Save
          </button>
          {status?.error && <span className="text-xs text-[var(--closed)]">{status.error}</span>}
          {status?.ok && <span className="text-xs text-primary">Saved.</span>}
        </div>
      </div>
    </Panel>
  );
}

// =============================================================================
// REELS
// =============================================================================
function ReelsTab({
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
        description={`Short YouTube clips from people who play at Ballpark. Paste any YouTube link — we verify it's embeddable before saving. Up to ${MAX_VISIBLE_REELS} can be visible (${visibleReels} now).`}
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
