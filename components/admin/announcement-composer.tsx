"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Send, RotateCcw, Mail, MailX } from "lucide-react";
import {
  sendAnnouncement,
  type AnnouncementState,
} from "@/app/admin/(protected)/announcements/actions";
import {
  ANNOUNCEMENT_PLACEHOLDERS,
  DEFAULT_ANNOUNCEMENT,
  buildAnnouncementVars,
  fillPlaceholders,
} from "@/lib/email/announcement";

export type ComposerRecipient = {
  player_id: string;
  name: string;
  email: string | null;
  category: string | null;
  price: number;
  acquisition_type: string;
  registration_code: string | null;
  franchise_id: string;
  franchise_name: string;
  franchise_code: string | null;
};

const initial: AnnouncementState = {};

export function AnnouncementComposer({
  recipients,
  fee,
  smtpConfigured,
}: {
  recipients: ComposerRecipient[];
  fee: number;
  smtpConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    sendAnnouncement,
    initial,
  );

  const [subject, setSubject] = useState(DEFAULT_ANNOUNCEMENT.subject);
  const [heading, setHeading] = useState(DEFAULT_ANNOUNCEMENT.heading);
  const [body, setBody] = useState(DEFAULT_ANNOUNCEMENT.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Default selection: everyone who has an email on file.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(recipients.filter((r) => r.email).map((r) => r.player_id)),
  );
  const [confirming, setConfirming] = useState(false);

  // Group by franchise for the picker.
  const groups = useMemo(() => {
    const map = new Map<string, ComposerRecipient[]>();
    for (const r of recipients) {
      const list = map.get(r.franchise_id) ?? [];
      list.push(r);
      map.set(r.franchise_id, list);
    }
    return [...map.values()]
      .map((list) =>
        list
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      .sort((a, b) => a[0].franchise_name.localeCompare(b[0].franchise_name));
  }, [recipients]);

  const selectableIds = useMemo(
    () => recipients.filter((r) => r.email).map((r) => r.player_id),
    [recipients],
  );

  const selectedWithEmail = useMemo(
    () =>
      recipients.filter((r) => r.email && selected.has(r.player_id)).length,
    [recipients, selected],
  );

  const toggle = (id: string) => {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFranchise = (ids: string[], on: boolean) => {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const insertToken = (token: string) => {
    setConfirming(false);
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => `${b}${token}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Restore focus + caret after the inserted token.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const resetTemplate = () => {
    setConfirming(false);
    setSubject(DEFAULT_ANNOUNCEMENT.subject);
    setHeading(DEFAULT_ANNOUNCEMENT.heading);
    setBody(DEFAULT_ANNOUNCEMENT.body);
  };

  // Live preview against the first selected recipient (or first overall).
  const sample =
    recipients.find((r) => selected.has(r.player_id)) ?? recipients[0] ?? null;
  const previewVars = sample
    ? buildAnnouncementVars(
        {
          player_name: sample.name,
          franchise_name: sample.franchise_name,
          franchise_code: sample.franchise_code,
          category: sample.category,
          price: sample.price,
          registration_code: sample.registration_code,
        },
        fee,
      )
    : null;
  const previewSubject = previewVars
    ? fillPlaceholders(subject, previewVars)
    : subject;
  const previewHeading = previewVars
    ? fillPlaceholders(heading, previewVars)
    : heading;
  const previewBody = previewVars ? fillPlaceholders(body, previewVars) : body;

  const canSend = selectedWithEmail > 0 && subject && heading && body;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Hidden inputs carry the current selection to the server action. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="player_ids" value={id} />
      ))}

      {!smtpConfigured && (
        <div className="rounded-md border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-4 py-3 text-sm text-foreground">
          <strong>Email isn&apos;t configured on the server</strong> (SMTP_USER /
          SMTP_PASSWORD not set), so sends will be skipped. Set those env vars to
          actually deliver mail.
        </div>
      )}

      {/* Result banner */}
      {(state.error ||
        state.sent !== undefined ||
        state.skipped !== undefined) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            state.error
              ? "border-destructive/40 bg-destructive/10 text-foreground"
              : "border-primary/40 bg-primary/10 text-foreground"
          }`}
        >
          {state.error ? (
            state.error
          ) : (
            <>
              <strong>{state.sent ?? 0} sent</strong>
              {state.skipped ? ` · ${state.skipped} skipped (SMTP off)` : ""}
              {state.failed ? ` · ${state.failed} failed` : ""}
              {state.noEmail ? ` · ${state.noEmail} had no email` : ""}.
            </>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,0.9fr)]">
        {/* ---------------- Composer ---------------- */}
        <div className="flex flex-col gap-4">
          <Field label="Subject">
            <input
              name="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setConfirming(false);
              }}
              className={inputCls}
              placeholder="Email subject line"
            />
          </Field>

          <Field label="Email heading (the big title inside the email)">
            <input
              name="heading"
              value={heading}
              onChange={(e) => {
                setHeading(e.target.value);
                setConfirming(false);
              }}
              className={inputCls}
              placeholder="e.g. Welcome to {{franchise_name}}!"
            />
          </Field>

          <Field label="Body">
            <textarea
              ref={bodyRef}
              name="body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              rows={14}
              className={`${inputCls} resize-y font-sans leading-relaxed`}
              placeholder="Write the message. Blank lines become paragraphs."
            />
          </Field>

          {/* Placeholder chips */}
          <div className="rounded-md border border-border bg-background/40 p-3">
            <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Insert a placeholder (click to add to the body)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ANNOUNCEMENT_PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => insertToken(p.token)}
                  title={`${p.label} — e.g. ${p.example}`}
                  className="rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {p.token}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Each is filled in per player when the email sends.
            </p>
          </div>

          <button
            type="button"
            onClick={resetTemplate}
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset to default template
          </button>
        </div>

        {/* ---------------- Live preview ---------------- */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Preview{" "}
            {sample ? (
              <span className="text-foreground/70 normal-case">
                — as {sample.name} ({sample.franchise_name})
              </span>
            ) : null}
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-background/60 px-4 py-2 text-xs">
              <span className="text-muted-foreground">Subject: </span>
              <span className="text-foreground">{previewSubject || "—"}</span>
            </div>
            <div className="bg-[#0a1e3d] p-5">
              <div className="h-[3px] w-full bg-[#f4b324]" />
              <h3 className="mt-3 mb-3 font-sans text-lg font-bold text-[#eaf1fb]">
                {previewHeading || "—"}
              </h3>
              <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap text-[#eaf1fb]">
                {previewBody || "—"}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Styling (logo, colours, footer) is applied automatically — this is a
            simplified preview of your copy.
          </p>
        </div>
      </div>

      {/* ---------------- Recipient picker ---------------- */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold tracking-wide text-foreground uppercase">
            Recipients
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {selectedWithEmail} selected
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setSelected(new Set(selectableIds));
              }}
              className="text-primary hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setSelected(new Set());
              }}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        {recipients.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No squad members yet — players appear here once they&apos;re sold /
            locked to a franchise.
          </p>
        ) : (
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {groups.map((list) => {
              const f = list[0];
              const ids = list.filter((r) => r.email).map((r) => r.player_id);
              const allOn =
                ids.length > 0 && ids.every((id) => selected.has(id));
              return (
                <div key={f.franchise_id} className="bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-heading text-sm font-bold tracking-wide text-foreground uppercase">
                      {f.franchise_code ? `${f.franchise_code} · ` : ""}
                      {f.franchise_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFranchise(ids, !allOn)}
                      disabled={ids.length === 0}
                      className="text-[11px] text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      {allOn ? "none" : "all"}
                    </button>
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {list.map((r) => {
                      const hasEmail = Boolean(r.email);
                      return (
                        <li key={r.player_id}>
                          <label
                            className={`flex items-center gap-2 rounded px-1.5 py-1 text-sm ${
                              hasEmail
                                ? "cursor-pointer hover:bg-background/50"
                                : "opacity-55"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(r.player_id)}
                              disabled={!hasEmail}
                              onChange={() => toggle(r.player_id)}
                              className="size-4 accent-primary"
                            />
                            <span className="flex-1 truncate text-foreground">
                              {r.name}
                            </span>
                            {hasEmail ? (
                              <Mail className="size-3.5 text-muted-foreground" />
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--closed)]">
                                <MailX className="size-3.5" /> no email
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- Send ---------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {!confirming ? (
          <button
            type="button"
            disabled={!canSend || pending}
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" /> Review &amp; send
          </button>
        ) : (
          <>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" />
              {pending
                ? "Sending…"
                : `Yes, email ${selectedWithEmail} player${
                    selectedWithEmail === 1 ? "" : "s"
                  }`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-border px-4 py-2.5 text-sm text-foreground/85 hover:border-foreground/40"
            >
              Cancel
            </button>
          </>
        )}
        {!canSend && (
          <span className="text-xs text-muted-foreground">
            Select at least one player with an email and fill in subject, heading
            &amp; body.
          </span>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
