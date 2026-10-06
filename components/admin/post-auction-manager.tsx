"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  Search,
  Lock,
  X,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import type { AuctionSnapshot, SquadEntry } from "@/lib/auction/snapshot";

type UnsoldPlayer = {
  id: string;
  full_name: string;
  assigned_category: string | null;
};

type RpcResult = { ok: boolean; error?: string } | null;

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function PostAuctionManager({ initial }: { initial: AuctionSnapshot }) {
  const { data, refetch } = useAuction(initial);
  const supabaseRef = useRef(createClient());

  const [pool, setPool] = useState<UnsoldPlayer[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Which UI panel is open: adding a new player, or replacing a specific squad
  // member (keyed by the outgoing player's id), or confirming a release.
  const [addOpen, setAddOpen] = useState(false);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [releaseFor, setReleaseFor] = useState<string | null>(null);

  // Load the approved player pool once (names + category for the unsold list).
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabaseRef.current
        .from("players")
        .select("id, full_name, assigned_category")
        .eq("status", "approved")
        .order("full_name", { ascending: true });
      setPool(rows ?? []);
    })();
  }, []);

  const soldIds = useMemo(
    () => new Set(data.franchises.flatMap((f) => f.squad.map((s) => s.player_id))),
    [data.franchises],
  );

  const unsold = useMemo(
    () => pool.filter((p) => !soldIds.has(p.id)),
    [pool, soldIds],
  );

  const franchises = data.franchises;
  const selected =
    franchises.find((f) => f.id === selectedFranchiseId) ?? franchises[0] ?? null;

  const basePrice = (cat: string | null) =>
    cat ? (data.settings.basePrice[cat] ?? 0) : 0;
  const squadMax = data.settings.squadMax;
  const squadMin = data.settings.squadMin;

  async function callRpc(
    fn: () => PromiseLike<{ data: unknown; error: unknown }>,
    successMsg: string,
  ) {
    setError(null);
    setNotice(null);
    setBusy(true);
    const { data: res, error: err } = await fn();
    setBusy(false);
    if (err) {
      setError((err as { message?: string }).message ?? "Something went wrong.");
      return false;
    }
    const r = res as RpcResult;
    if (r && !r.ok) {
      setError(r.error ?? "Action failed.");
      return false;
    }
    setNotice(successMsg);
    await refetch();
    return true;
  }

  async function doAdd(player: UnsoldPlayer) {
    if (!selected) return;
    const price = basePrice(player.assigned_category);
    const ok = await callRpc(
      () =>
        supabaseRef.current.rpc("post_add_player", {
          p_franchise: selected.id,
          p_player: player.id,
        }),
      `Added ${player.full_name} to ${selected.name} for ₹${inr(price)}.`,
    );
    if (ok) setAddOpen(false);
  }

  async function doReplace(outPlayerId: string, inPlayer: UnsoldPlayer) {
    if (!selected) return;
    const ok = await callRpc(
      () =>
        supabaseRef.current.rpc("post_replace_player", {
          p_franchise: selected.id,
          p_out_player: outPlayerId,
          p_in_player: inPlayer.id,
        }),
      `Swapped in ${inPlayer.full_name} (spend unchanged).`,
    );
    if (ok) setReplaceFor(null);
  }

  async function doRelease(member: SquadEntry) {
    if (!selected) return;
    const ok = await callRpc(
      () =>
        supabaseRef.current.rpc("post_release_player", {
          p_player: member.player_id,
        }),
      `Released ${member.full_name}, refunded ₹${inr(member.price)}.`,
    );
    if (ok) setReleaseFor(null);
  }

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">No franchises found.</p>
    );
  }

  const spent = selected.purse_total - selected.purse_remaining;
  const belowMin = selected.squadCount < squadMin;

  // Squad sorted: auction buys first (editable), then locked setup members.
  const squad = selected.squad.slice().sort((a, b) => {
    const rank = (m: SquadEntry) => (m.acquisition_type === "auction" ? 0 : 1);
    const r = rank(a) - rank(b);
    return r !== 0 ? r : b.price - a.price;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Franchise selector */}
      <div className="flex flex-wrap gap-2">
        {franchises.map((f) => {
          const active = f.id === selected.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedFranchiseId(f.id);
                setAddOpen(false);
                setReplaceFor(null);
                setReleaseFor(null);
                setError(null);
                setNotice(null);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {f.short_code ? `${f.short_code}` : f.name}
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                {f.squadCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Banners */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-foreground">
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm text-foreground">
          {notice}
        </div>
      )}

      {/* Selected franchise panel */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
              {selected.short_code ? `${selected.short_code} · ` : ""}
              {selected.name}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              Spent ₹{inr(spent)} · Remaining ₹{inr(selected.purse_remaining)} ·
              Purse ₹{inr(selected.purse_total)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-sm ${belowMin ? "text-[var(--closed)]" : "text-foreground"}`}
            >
              {selected.squadCount}/{squadMax}
              <span className="ml-1 text-[11px] text-muted-foreground">
                min {squadMin}
              </span>
            </span>
            <button
              type="button"
              disabled={busy || selected.squadCount >= squadMax}
              onClick={() => {
                setAddOpen((v) => !v);
                setReplaceFor(null);
                setReleaseFor(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" /> Add player
            </button>
          </div>
        </div>

        {belowMin && (
          <div className="flex items-center gap-2 border-b border-border bg-[var(--closed)]/10 px-4 py-2 text-xs text-foreground">
            <AlertTriangle className="size-3.5 text-[var(--closed)]" />
            Below the minimum squad size of {squadMin}.
          </div>
        )}

        {/* Add picker */}
        {addOpen && (
          <div className="border-b border-border bg-background/40 p-4">
            <p className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              Add an unsold player at their base price
            </p>
            <UnsoldPicker
              players={unsold}
              disabled={busy}
              onPick={doAdd}
              onCancel={() => setAddOpen(false)}
              priceFor={(p) => basePrice(p.assigned_category)}
              affordableFor={(p) =>
                selected.purse_remaining >= basePrice(p.assigned_category)
              }
            />
          </div>
        )}

        {/* Squad table */}
        {squad.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No players on this squad.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {squad.map((m) => {
              const editable = m.acquisition_type === "auction";
              const type = m.display_as_owner ? "owner" : m.acquisition_type;
              return (
                <div key={m.player_id}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="min-w-[160px] flex-1 font-medium text-foreground">
                      {m.full_name}
                    </span>
                    <span className="w-24 text-muted-foreground">
                      {m.category ?? "—"}
                    </span>
                    <span className="w-20 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                      {type}
                    </span>
                    <span className="w-24 text-right font-mono text-foreground">
                      ₹{inr(m.price)}
                    </span>
                    <div className="flex w-[180px] justify-end gap-1.5">
                      {editable ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setReplaceFor(
                                replaceFor === m.player_id ? null : m.player_id,
                              );
                              setReleaseFor(null);
                              setAddOpen(false);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground/85 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                          >
                            <ArrowLeftRight className="size-3.5" /> Replace
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setReleaseFor(
                                releaseFor === m.player_id ? null : m.player_id,
                              );
                              setReplaceFor(null);
                              setAddOpen(false);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-[var(--closed)] transition-colors hover:border-[var(--closed)] disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" /> Release
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Lock className="size-3" /> locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Replace picker for this row */}
                  {replaceFor === m.player_id && (
                    <div className="bg-background/40 px-4 pb-4">
                      <p className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                        Swap out {m.full_name} — the new player keeps the ₹
                        {inr(m.price)} spend
                        <button
                          type="button"
                          onClick={() => setReplaceFor(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </p>
                      <UnsoldPicker
                        players={unsold}
                        disabled={busy}
                        onPick={(p) => doReplace(m.player_id, p)}
                        onCancel={() => setReplaceFor(null)}
                        priceFor={() => m.price}
                        affordableFor={() => true}
                      />
                    </div>
                  )}

                  {/* Release confirm for this row */}
                  {releaseFor === m.player_id && (
                    <div className="flex flex-wrap items-center gap-3 bg-[var(--closed)]/10 px-4 py-3 text-sm">
                      <span className="text-foreground">
                        Release <strong>{m.full_name}</strong> and refund{" "}
                        <strong>₹{inr(m.price)}</strong> to the purse?
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => doRelease(m)}
                        className="rounded-md bg-[var(--closed)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Yes, release
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setReleaseFor(null)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground/85 hover:border-foreground/40"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        {unsold.length} unsold approved players available. Changes are live
        immediately and are deliberately <strong>not undoable</strong> from the
        auction console — reverse a change by making the opposite edit here.
      </p>
    </div>
  );
}

/** Searchable unsold-player picker used by both the Add and Replace flows. */
function UnsoldPicker({
  players,
  disabled,
  onPick,
  onCancel,
  priceFor,
  affordableFor,
}: {
  players: UnsoldPlayer[];
  disabled: boolean;
  onPick: (p: UnsoldPlayer) => void;
  onCancel: () => void;
  priceFor: (p: UnsoldPlayer) => number;
  affordableFor: (p: UnsoldPlayer) => boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? players.filter((p) => p.full_name.toLowerCase().includes(needle))
      : players;
    return list.slice(0, 60);
  }, [players, q]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search unsold players…"
          className="w-full rounded-md border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {players.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No unsold players available.
        </p>
      ) : (
        <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto rounded-md border border-border">
          {filtered.map((p) => {
            const price = priceFor(p);
            const affordable = affordableFor(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled || !affordable}
                  onClick={() => onPick(p)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="flex-1 truncate text-foreground">
                    {p.full_name}
                  </span>
                  <span className="w-24 truncate text-xs text-muted-foreground">
                    {p.assigned_category ?? "—"}
                  </span>
                  <span className="w-24 text-right font-mono text-xs text-foreground">
                    ₹{inr(price)}
                    {!affordable && (
                      <span className="ml-1 text-[var(--closed)]">·can&apos;t afford</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No matches.
            </li>
          )}
        </ul>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}
