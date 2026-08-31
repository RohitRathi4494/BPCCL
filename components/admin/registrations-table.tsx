"use client";

import { Fragment, useActionState, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import {
  bulkApprovePlayers,
  emailAadhaarRemindersToSelected,
  type BulkState,
  type ReminderState,
} from "@/app/admin/(protected)/registrations/actions";
import { RegistrationStatus as StatusBadge } from "@/components/admin/registration-status";
import { DeletePlayerButton } from "@/components/admin/delete-player-button";
import { STAT_FIELDS } from "@/lib/registration";
import type { Player } from "@/lib/types";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm break-words text-foreground">{value || "—"}</span>
    </div>
  );
}

function ProfileLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-sm text-foreground">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      {label} <ExternalLink className="size-3.5" />
    </a>
  );
}

/** Full field dump for one player, shown inline when a row is expanded. */
function PlayerDetails({ p }: { p: Player }) {
  return (
    <div className="flex flex-col gap-5 border-t border-border/60 bg-background/40 px-4 py-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Registration Code" value={p.registration_code} />
        <Field label="Contact No." value={p.phone} />
        <Field label="Email" value={p.email} />
        <Field label="Company" value={p.company} />
        <Field label="Work Email" value={p.work_email} />
        <Field label="Date of Birth" value={fmtDate(p.dob)} />
        <Field label="Age" value={p.age} />
        <Field label="T-Shirt Size" value={p.tshirt_size} />
        <Field label="Lower Size" value={p.lower_size} />
        <Field label="Jersey Number" value={p.jersey_number} />
        <Field label="Jersey Name" value={p.jersey_name} />
        <Field
          label="CricHeroes"
          value={<ProfileLink href={p.cricheroes_url} label="Open profile" />}
        />
        <Field
          label="LinkedIn"
          value={<ProfileLink href={p.linkedin_url} label="Open profile" />}
        />
        <Field
          label="Registration Fee"
          value={p.registration_fee_agreed ? "Agreed" : "Not agreed"}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Playing Role
        </span>
        {p.roles && p.roles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {p.roles.map((r) => (
              <span
                key={r}
                className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-foreground"
              >
                {r}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-foreground">—</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} value={p[f.key] ?? "—"} />
        ))}
      </div>

      {p.status === "rejected" && p.rejection_reason && (
        <div className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 p-3">
          <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--closed)] uppercase">
            Rejection reason
          </span>
          <p className="mt-1 text-sm text-foreground">{p.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}

export function RegistrationsTable({ rows }: { rows: Player[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [state, formAction, pending] = useActionState<BulkState, FormData>(
    bulkApprovePlayers,
    {},
  );
  const [remindState, remindAction, reminding] = useActionState<
    ReminderState,
    FormData
  >(emailAadhaarRemindersToSelected, {});

  // Clear the selection when a new bulk-approve result arrives — done during
  // render (React's endorsed reset-on-change pattern), not in an effect.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.approved !== undefined && selected.size > 0) setSelected(new Set());
  }
  // Note: unlike approve, a reminder-send does NOT clear the selection — the
  // players stay in the list (they still haven't uploaded), and keeping the
  // selection keeps the "Sent N." result visible in the bar until Clear.

  const busy = pending || reminding;
  const remindResult =
    remindState.sent !== undefined
      ? `Sent ${remindState.sent}` +
        (remindState.skipped ? `, ${remindState.skipped} skipped (no SMTP)` : "") +
        (remindState.failed ? `, ${remindState.failed} failed` : "") +
        (remindState.ineligible
          ? `, ${remindState.ineligible} ineligible (already uploaded / rejected / no email)`
          : "") +
        "."
      : null;

  // Effective selection = only ids still present on the page (derived, so a
  // refresh that drops rows can't leave stale ids selected).
  const present = new Set(rows.map((r) => r.id));
  const effective = new Set([...selected].filter((id) => present.has(id)));

  const allSelected = rows.length > 0 && effective.size === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(() =>
      effective.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk action bar — appears once at least one row is selected */}
      {effective.size > 0 && (
        <form
          action={formAction}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5"
        >
          {[...effective].map((id) => (
            <input key={id} type="hidden" name="player_ids" value={id} />
          ))}
          <span className="font-mono text-xs tracking-wider text-foreground uppercase">
            {effective.size} selected
          </span>
          <button
            type="submit"
            formAction={formAction}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-heading text-xs font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Approve {effective.size} selected
          </button>
          <button
            type="submit"
            formAction={remindAction}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm border border-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {reminding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            Email Aadhaar reminder
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
          {state.error && (
            <span className="text-xs text-[var(--closed)]">{state.error}</span>
          )}
          {remindState.error && (
            <span className="text-xs text-[var(--closed)]">
              {remindState.error}
            </span>
          )}
          {remindResult && (
            <span className="text-xs text-accent">{remindResult}</span>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all on this page"
                  className="size-4 accent-[var(--gold)] align-middle"
                />
              </th>
              {["Player", "Contact", "Email", "Age", "Submitted", "Status", "Category", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  No registrations match this view.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const checked = effective.has(p.id);
                const isOpen = expanded.has(p.id);
                return (
                  <Fragment key={p.id}>
                    <tr
                      className={
                        "border-b border-border/60 transition-colors " +
                        (checked
                          ? "bg-accent/5"
                          : isOpen
                            ? "bg-card/60"
                            : "hover:bg-card/60")
                      }
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
                          aria-label={`Select ${p.full_name}`}
                          className="size-4 accent-[var(--gold)] align-middle"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.id)}
                          aria-expanded={isOpen}
                          className="inline-flex items-center gap-1.5 text-left font-medium text-foreground transition-colors hover:text-primary"
                        >
                          <ChevronDown
                            className={
                              "size-4 shrink-0 text-muted-foreground transition-transform " +
                              (isOpen ? "rotate-180" : "")
                            }
                          />
                          {p.full_name}
                        </button>
                        {p.cricheroes_url && (
                          <a
                            href={p.cricheroes_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase hover:text-primary"
                          >
                            CH <ExternalLink className="size-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.age}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {fmtDate(p.submitted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.assigned_category ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/registrations/${p.id}`}
                            className="inline-flex items-center rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            Review
                          </Link>
                          <DeletePlayerButton
                            playerId={p.id}
                            playerName={p.full_name}
                          />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border/60">
                        <td colSpan={9} className="p-0">
                          <PlayerDetails p={p} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
