"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import {
  bulkApprovePlayers,
  type BulkState,
} from "@/app/admin/(protected)/registrations/actions";
import { RegistrationStatus as StatusBadge } from "@/components/admin/registration-status";
import { DeletePlayerButton } from "@/components/admin/delete-player-button";
import type { Player } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RegistrationsTable({ rows }: { rows: Player[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<BulkState, FormData>(
    bulkApprovePlayers,
    {},
  );

  // After a successful bulk approve, drop the selection.
  useEffect(() => {
    if (state.approved !== undefined) setSelected(new Set());
  }, [state]);

  // Prune ids that are no longer on the page (e.g. after a refresh).
  useEffect(() => {
    const present = new Set(rows.map((r) => r.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk action bar — appears once at least one row is selected */}
      {selected.size > 0 && (
        <form
          action={formAction}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="player_ids" value={id} />
          ))}
          <span className="font-mono text-xs tracking-wider text-foreground uppercase">
            {selected.size} selected
          </span>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-heading text-xs font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Approve {selected.size} selected
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
              {["Player", "Contact", "Email", "Age", "Submitted", "Status", "Grade", ""].map(
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
                const checked = selected.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={
                      "border-b border-border/60 last:border-0 transition-colors " +
                      (checked ? "bg-accent/5" : "hover:bg-card/60")
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
                      <span className="font-medium text-foreground">
                        {p.full_name}
                      </span>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
