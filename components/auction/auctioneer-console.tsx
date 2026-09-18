"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Play,
  Pause,
  Flag,
  Search,
  ChevronUp,
  Undo2,
  Plus,
  Minus,
  Gavel,
  X,
  RotateCcw,
  CornerUpLeft,
  ExternalLink,
  Repeat,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import {
  formatMoney,
  type AuctionSnapshot,
  type CurrentBid,
  type FranchiseView,
} from "@/lib/auction/snapshot";
import type { TablesUpdate } from "@/lib/types";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";
import { cn } from "@/lib/utils";

type PoolPlayer = {
  id: string;
  full_name: string;
  role: string | null;
  assigned_category: string | null;
  cricheroes_url: string | null;
};
type RpcResult = { ok: boolean; error?: string } | null;

export function AuctioneerConsole({ initial }: { initial: AuctionSnapshot }) {
  const { data, live, refetch } = useAuction(initial);
  const supabaseRef = useRef(createClient());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pool, setPool] = useState<PoolPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabaseRef.current
        .from("players")
        .select("id, full_name, role, assigned_category, cricheroes_url")
        .eq("status", "approved")
        .order("full_name", { ascending: true });
      setPool(rows ?? []);
    })();
  }, []);

  const soldIds = useMemo(
    () => new Set(data.franchises.flatMap((f) => f.squad.map((s) => s.player_id))),
    [data.franchises],
  );

  const status = data.state.status;
  const category = data.state.current_category;
  const stateId = data.state.id;

  // Sticky pool filter, kept in the URL so it survives reloads and the browser
  // back button and stays until the auctioneer changes it. When no explicit
  // filter is set it falls back to the live auction category (preserving the
  // "pool follows the category being auctioned" behaviour). A sentinel value of
  // "all" means the auctioneer has explicitly chosen to see every category.
  const catParam = searchParams.get("cat");
  const poolCat = catParam ?? category ?? "all";
  const showAllCategories = poolCat === "all";

  // Write an explicit sticky filter into the URL (replace → no new history entry,
  // so a single back press still leaves the console).
  const setPoolCat = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("cat", value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Clear the explicit filter so the pool falls back to the auction category.
  const clearPoolCat = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("cat");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter(
      (p) =>
        !soldIds.has(p.id) &&
        p.id !== data.state.current_player_id &&
        (showAllCategories || p.assigned_category === poolCat) &&
        (!q || p.full_name.toLowerCase().includes(q)),
    );
  }, [pool, soldIds, data.state.current_player_id, showAllCategories, poolCat, query]);

  async function updateState(patch: TablesUpdate<"auction_state">) {
    if (!stateId) return;
    setError(null);
    setBusy(true);
    const { error: err } = await supabaseRef.current
      .from("auction_state")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", stateId);
    setBusy(false);
    if (err) setError(err.message);
    else await refetch();
  }

  async function callRpc(
    fn: () => PromiseLike<{ data: unknown; error: unknown }>,
  ) {
    setError(null);
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
    await refetch();
    return true;
  }

  const setStatus = (s: string) => updateState({ status: s });
  const setCategory = (c: string) => {
    updateState({ current_category: c === category ? null : c });
    // Selecting the category to auction re-syncs the pool view to it.
    clearPoolCat();
  };
  const putUp = (playerId: string) =>
    updateState({
      current_player_id: playerId,
      current_result: null,
      current_result_franchise_id: null,
      current_result_amount: null,
      current_bid: null,
      current_bid_franchise_id: null,
      status: "in_progress",
    });

  // Live bidding: set the running highest bid + which franchise holds it.
  const setBid = (amount: number | null, franchiseId: string | null) =>
    updateState({
      current_bid: amount,
      current_bid_franchise_id: franchiseId,
    });

  const undo = () =>
    callRpc(() => supabaseRef.current.rpc("undo_last_action"));
  const resetAuction = async () => {
    const ok = await callRpc(() => supabaseRef.current.rpc("reset_auction"));
    if (ok) setConfirmReset(false);
  };
  const applyTopup = (franchiseId: string, which: 1 | 2) =>
    callRpc(() =>
      supabaseRef.current.rpc("apply_topup", {
        p_franchise: franchiseId,
        p_which: which,
      }),
    );
  const markUnsold = (playerId: string) =>
    callRpc(() =>
      supabaseRef.current.rpc("mark_player_unsold", { p_player: playerId }),
    );
  const sell = (playerId: string, franchiseId: string, amount: number) =>
    callRpc(() =>
      supabaseRef.current.rpc("sell_player", {
        p_player: playerId,
        p_franchise: franchiseId,
        p_amount: amount,
      }),
    );
  const sellRtm = (
    playerId: string,
    rtmFranchiseId: string,
    primaryFranchiseId: string,
    amount: number,
  ) =>
    callRpc(() =>
      supabaseRef.current.rpc("sell_player_rtm", {
        p_player: playerId,
        p_rtm_franchise: rtmFranchiseId,
        p_primary_franchise: primaryFranchiseId,
        p_amount: amount,
      }),
    );

  const onBlock = data.currentPlayer;
  const resultPending = data.result.status === null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
            Auctioneer Console
          </h1>
          <div className="flex items-center gap-3">
            <AuctionStatusPill status={status} />
            <LiveBadge live={live} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ControlButton onClick={undo} disabled={busy}>
            <Undo2 className="size-4" /> Undo
          </ControlButton>
          {status !== "in_progress" && status !== "completed" && (
            <ControlButton onClick={() => setStatus("in_progress")} disabled={busy}>
              <Play className="size-4" /> {status === "paused" ? "Resume" : "Start"}
            </ControlButton>
          )}
          {status === "in_progress" && (
            <ControlButton onClick={() => setStatus("paused")} disabled={busy}>
              <Pause className="size-4" /> Pause
            </ControlButton>
          )}
          {status === "completed" && (
            <ControlButton onClick={() => setStatus("in_progress")} disabled={busy}>
              <CornerUpLeft className="size-4" /> Reopen
            </ControlButton>
          )}
          {status !== "completed" && (
            <ControlButton
              onClick={() => setStatus("completed")}
              disabled={busy}
              variant="danger"
            >
              <Flag className="size-4" /> Complete
            </ControlButton>
          )}
          <ControlButton
            onClick={() => setConfirmReset(true)}
            disabled={busy}
            variant="danger"
          >
            <RotateCcw className="size-4" /> Reset
          </ControlButton>
        </div>
      </div>

      {/* Reset confirmation */}
      {confirmReset && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-4 py-3">
          <span className="text-sm text-foreground">
            <strong>Reset the auction?</strong> This clears only the auction
            picks and returns to setup. Owners and retentions are kept, and each
            purse is restored to the default minus the retention spend. Top-ups
            are cleared. This can&apos;t be undone.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={resetAuction}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--closed)] px-4 py-2 font-heading text-xs font-bold tracking-wide text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Yes, reset the auction
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              disabled={busy}
              className="inline-flex items-center rounded-sm border border-border px-4 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Category
        </span>
        {data.settings.categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            disabled={busy}
            className={cn(
              "rounded-sm border px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors disabled:opacity-50",
              c === category
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground/80 hover:border-primary/40",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: current player + sell + pool */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CurrentPlayerCard snapshot={data} />

          {onBlock && status === "in_progress" && (
            resultPending ? (
              <>
                <LiveBidPanel
                  key={`bid-${onBlock.id}`}
                  franchises={data.franchises}
                  currentBid={data.currentBid}
                  openingBid={
                    data.settings.basePrice[onBlock.assigned_category ?? ""] ?? 0
                  }
                  defaultStep={
                    data.settings.stepPrice[onBlock.assigned_category ?? ""] ||
                    (data.settings.bidIncrement >= 100
                      ? data.settings.bidIncrement
                      : 1000)
                  }
                  squadMax={data.settings.squadMax}
                  busy={busy}
                  onSetBid={setBid}
                />
                <SellPanel
                  key={onBlock.id}
                  franchises={data.franchises}
                  squadMax={data.settings.squadMax}
                  squadMin={data.settings.squadMin}
                  rtmPerFranchise={data.settings.rtmPerFranchise}
                  rtmMaxAgainst={data.settings.rtmMaxAgainst}
                  currentBid={data.currentBid}
                  busy={busy}
                  onSell={(fid, amt) => sell(onBlock.id, fid, amt)}
                  onSellRtm={(rtmFid, primaryFid, amt) =>
                    sellRtm(onBlock.id, rtmFid, primaryFid, amt)
                  }
                  onUnsold={() => markUnsold(onBlock.id)}
                />
              </>
            ) : (
              <p className="rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                {data.result.status === "sold"
                  ? "Sale recorded. Pull the next player from the pool below."
                  : "Marked unsold. Pull the next player from the pool below."}
              </p>
            )
          )}

          {status === "paused" && (
            <p className="rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Auction is paused — resume to record sales.
            </p>
          )}

          {/* Player pool */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
                {showAllCategories ? "Pool · " : `${poolCat} · `}
                {available.length}
              </h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name…"
                  className="w-full rounded-sm border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Sticky pool filter — narrows the list by category without touching
                the live auction category. Persists in the URL until changed. */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Filter
              </span>
              <button
                type="button"
                onClick={() => setPoolCat("all")}
                className={cn(
                  "rounded-sm border px-2.5 py-1 font-mono text-[11px] tracking-wider uppercase transition-colors",
                  showAllCategories
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground/70 hover:border-primary/40",
                )}
              >
                All
              </button>
              {data.settings.categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPoolCat(c)}
                  className={cn(
                    "rounded-sm border px-2.5 py-1 font-mono text-[11px] tracking-wider uppercase transition-colors",
                    !showAllCategories && poolCat === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/70 hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-96 overflow-y-auto">
              {available.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {pool.length === 0
                    ? "No approved players yet — approve players in the registrations dashboard first."
                    : !showAllCategories
                      ? `No available players in ${poolCat}.`
                      : "All players in this view have been picked, or none match your search."}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {available.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {p.full_name}
                        </p>
                        <p className="truncate font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          {p.assigned_category ?? "—"} · {p.role ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.cricheroes_url && (
                          <a
                            href={p.cricheroes_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open CricHeroes profile"
                            className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
                          >
                            CH <ExternalLink className="size-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => putUp(p.id)}
                          disabled={busy || status === "completed"}
                          className="inline-flex items-center gap-1 rounded-sm border border-primary px-3 py-1.5 text-xs font-bold text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                        >
                          <ChevronUp className="size-3.5" /> Put up
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right: purses + top-ups */}
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-3 font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
              Purses & Top-ups
            </h3>
            <div className="flex flex-col gap-2.5">
              {data.franchises.map((f) => (
                <TopupRow
                  key={f.id}
                  f={f}
                  squadMax={data.settings.squadMax}
                  topup1={data.settings.topup1}
                  topup2={data.settings.topup2}
                  busy={busy}
                  onTopup={(which) => applyTopup(f.id, which)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Live bidding panel. Bidding is verbal in the room; the auctioneer taps the
 * franchise that just bid and the running highest bid climbs by one step. The
 * first tap opens at the player's category base price. Everything writes to
 * auction_state so the big screen updates live.
 */
function LiveBidPanel({
  franchises,
  currentBid,
  openingBid,
  defaultStep,
  squadMax,
  busy,
  onSetBid,
}: {
  franchises: FranchiseView[];
  currentBid: CurrentBid;
  openingBid: number;
  defaultStep: number;
  squadMax: number;
  busy: boolean;
  onSetBid: (amount: number | null, franchiseId: string | null) => void;
}) {
  // Step defaults to the on-block player's category step price (set in Auction
  // Setup); still fully editable live. Keyed by player in the parent, so it
  // re-seeds to the right category step each time a new player comes up.
  const [step, setStep] = useState(defaultStep >= 1 ? defaultStep : 1000);
  const [overrideStr, setOverrideStr] = useState("");

  const hasBid = currentBid.amount != null;
  const nextAmount = hasBid ? (currentBid.amount ?? 0) + step : openingBid;

  const tapTeam = (fid: string) => onSetBid(nextAmount, fid);
  const minusStep = () =>
    hasBid &&
    onSetBid(Math.max(0, (currentBid.amount ?? 0) - step), currentBid.franchise_id);
  const clear = () => onSetBid(null, null);
  const applyOverride = () => {
    const v = Number(overrideStr);
    if (overrideStr.trim() !== "" && Number.isFinite(v) && v >= 0) {
      onSetBid(v, currentBid.franchise_id);
      setOverrideStr("");
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
          <Gavel className="size-4" /> Live Bidding
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Step
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={step}
            onChange={(e) => setStep(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-sm border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Current bid readout */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 py-3">
        {hasBid ? (
          <>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Current bid
              </span>
              <span className="font-heading text-4xl font-extrabold tracking-tight text-accent">
                ₹{formatMoney(currentBid.amount)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Highest bidder
              </span>
              <span className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
                {currentBid.franchise_name ?? "—"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              No bids yet
            </span>
            <span className="text-sm text-muted-foreground">
              First tap opens at{" "}
              <strong className="text-foreground">₹{formatMoney(openingBid)}</strong>{" "}
              (category base price).
            </span>
          </div>
        )}
      </div>

      {/* 16 team buttons */}
      <div>
        <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Tap the team that just bid → ₹{formatMoney(nextAmount)}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {franchises.map((f) => {
            const leading = f.id === currentBid.franchise_id;
            const full = f.squadCount >= squadMax;
            const cantAfford = f.purse_remaining < nextAmount;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => tapTeam(f.id)}
                disabled={busy || full}
                title={
                  full
                    ? "Squad full"
                    : cantAfford
                      ? `Short on purse for ₹${formatMoney(nextAmount)}`
                      : undefined
                }
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-40",
                  leading
                    ? "border-primary bg-primary/15 ring-1 ring-primary"
                    : cantAfford
                      ? "border-[var(--closed)]/40 hover:border-[var(--closed)]"
                      : "border-border hover:border-primary hover:bg-primary/5",
                )}
              >
                <span className="w-full truncate font-heading text-sm font-bold tracking-wide text-foreground uppercase">
                  {f.short_code ?? f.name}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-wider",
                    cantAfford ? "text-[var(--closed)]" : "text-muted-foreground",
                  )}
                >
                  ₹{formatMoney(f.purse_remaining)} · {f.squadCount}/{squadMax}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corrections: −step, clear, manual override */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={minusStep}
          disabled={busy || !hasBid}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] tracking-wider text-foreground/80 uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Minus className="size-3.5" /> {formatMoney(step)}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={busy || !hasBid}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] tracking-wider text-foreground/80 uppercase transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)] disabled:opacity-40"
        >
          <X className="size-3.5" /> Clear
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={overrideStr}
            onChange={(e) => setOverrideStr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyOverride()}
            placeholder="Set exact ₹"
            className="w-28 rounded-sm border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={applyOverride}
            disabled={busy || overrideStr.trim() === ""}
            className="inline-flex items-center rounded-sm border border-primary px-3 py-1.5 font-mono text-[11px] tracking-wider text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sale entry: amount + franchise select + guardrails, with an RTM path. */
function SellPanel({
  franchises,
  squadMax,
  squadMin,
  rtmPerFranchise,
  rtmMaxAgainst,
  currentBid,
  busy,
  onSell,
  onSellRtm,
  onUnsold,
}: {
  franchises: FranchiseView[];
  squadMax: number;
  squadMin: number;
  rtmPerFranchise: number;
  rtmMaxAgainst: number;
  currentBid: CurrentBid;
  busy: boolean;
  onSell: (franchiseId: string, amount: number) => void;
  onSellRtm: (
    rtmFranchiseId: string,
    primaryFranchiseId: string,
    amount: number,
  ) => void;
  onUnsold: () => void;
}) {
  // The sale fields follow the live bid automatically until the auctioneer
  // starts editing (dirty), which lets them correct the final amount / winning
  // team before confirming. "Reset to live bid" drops back to auto-follow.
  // Derived-from-prop (no effect) so live bids flow straight through.
  const liveAmountStr = currentBid.amount != null ? String(currentBid.amount) : "";
  const liveFranchiseId = currentBid.franchise_id ?? "";
  const [dirty, setDirty] = useState(false);
  const [amountOverride, setAmountOverride] = useState("");
  const [franchiseOverride, setFranchiseOverride] = useState("");

  // RTM: when the old franchise matches the final (revised) bid, the player goes
  // to them instead of the primary bidder. The "winning franchise" above is the
  // PRIMARY bidder in that case; the RTM team is chosen separately below.
  const [rtm, setRtm] = useState(false);
  const [rtmFranchiseId, setRtmFranchiseId] = useState("");

  const amountStr = dirty ? amountOverride : liveAmountStr;
  const franchiseId = dirty ? franchiseOverride : liveFranchiseId;

  const editAmount = (v: string) => {
    // Seed the other field from the live bid on the first edit.
    setFranchiseOverride((prev) => (dirty ? prev : liveFranchiseId));
    setAmountOverride(v);
    setDirty(true);
  };
  const editFranchise = (v: string) => {
    setAmountOverride((prev) => (dirty ? prev : liveAmountStr));
    setFranchiseOverride(v);
    setDirty(true);
  };

  const amount = Number(amountStr);
  const validAmount = amountStr.trim() !== "" && Number.isFinite(amount) && amount >= 0;
  const selected = franchises.find((f) => f.id === franchiseId) ?? null;

  const full = selected ? selected.squadCount >= squadMax : false;
  const insufficient = selected && validAmount ? selected.purse_remaining < amount : false;

  // Soft warning: this franchise will still be below the squad minimum.
  const shortfall =
    selected && selected.squadCount + 1 < squadMin
      ? squadMin - (selected.squadCount + 1)
      : 0;

  // --- RTM eligibility -------------------------------------------------------
  // A franchise can exercise RTM if it played Season 1 and still has an RTM
  // spare. It can't be the primary bidder, and it needs purse + squad room.
  const rtmEligible = franchises.filter(
    (f) =>
      f.played_season_1 &&
      f.rtm_used < rtmPerFranchise &&
      f.id !== franchiseId,
  );
  const rtmTeam = franchises.find((f) => f.id === rtmFranchiseId) ?? null;
  const primaryMaxedOut =
    !!selected && selected.rtm_against_count >= rtmMaxAgainst;
  const rtmFull = rtmTeam ? rtmTeam.squadCount >= squadMax : false;
  const rtmInsufficient =
    rtmTeam && validAmount ? rtmTeam.purse_remaining < amount : false;

  const canSell = !!selected && validAmount && !full && !insufficient && !busy;
  const canSellRtm =
    !!selected &&
    !!rtmTeam &&
    validAmount &&
    !primaryMaxedOut &&
    !rtmFull &&
    !rtmInsufficient &&
    !busy;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] tracking-[0.24em] text-accent uppercase">
          Record Sale
        </h3>
        {dirty && (currentBid.amount != null || currentBid.franchise_id) && (
          <button
            type="button"
            onClick={() => setDirty(false)}
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-accent"
          >
            <RotateCcw className="size-3" /> Reset to live bid
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Final amount (₹) — editable
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={amountStr}
            onChange={(e) => editAmount(e.target.value)}
            placeholder="e.g. 12000"
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            {rtm ? "Primary bidder (final bid)" : "Winning franchise"}
          </span>
          <select
            value={franchiseId}
            onChange={(e) => editFranchise(e.target.value)}
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select franchise…</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.short_code ? `${f.short_code} · ` : ""}
                {f.name} — ₹{formatMoney(f.purse_remaining)} · {f.squadCount}/{squadMax}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* RTM toggle + old-franchise picker */}
      <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={rtm}
            onChange={(e) => setRtm(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          <span className="inline-flex items-center gap-1.5 font-heading text-sm font-bold tracking-wide text-primary uppercase">
            <Repeat className="size-4" /> Player taken via RTM
          </span>
        </label>

        {rtm && (
          <>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground">
              After the primary bidder&apos;s revised bid, the old franchise
              matches it and takes the player at ₹{formatMoney(amount || 0)}.
            </p>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                RTM team (old franchise)
              </span>
              <select
                value={rtmFranchiseId}
                onChange={(e) => setRtmFranchiseId(e.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Select RTM team…</option>
                {rtmEligible.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.short_code ? `${f.short_code} · ` : ""}
                    {f.name} — ₹{formatMoney(f.purse_remaining)} ·{" "}
                    {f.squadCount}/{squadMax}
                  </option>
                ))}
              </select>
            </label>
            {rtmEligible.length === 0 && (
              <p className="text-xs text-[var(--closed)]">
                No franchise is eligible — a returning (Season 1) team with its
                RTM still unused is needed. Mark Season 1 teams in Auction Setup.
              </p>
            )}
            {primaryMaxedOut && (
              <p className="text-xs text-[var(--closed)]">
                {rtmMaxAgainst} RTMs have already been used against {selected?.name}
                {" "}— no further RTM can be used against them.
              </p>
            )}
            {rtmFull && (
              <p className="text-xs text-[var(--closed)]">
                {rtmTeam?.name} is already at the squad maximum ({squadMax}).
              </p>
            )}
            {rtmInsufficient && (
              <p className="text-xs text-[var(--closed)]">
                {rtmTeam?.name} only has ₹{formatMoney(rtmTeam?.purse_remaining)}{" "}
                left — not enough for ₹{formatMoney(amount)}.
              </p>
            )}
          </>
        )}
      </div>

      {!rtm && full && (
        <p className="text-xs text-[var(--closed)]">
          {selected?.name} is already at the squad maximum ({squadMax}). Cannot buy.
        </p>
      )}
      {!rtm && insufficient && (
        <p className="text-xs text-[var(--closed)]">
          {selected?.name} only has ₹{formatMoney(selected?.purse_remaining)} left —
          not enough for ₹{formatMoney(amount)}.
        </p>
      )}
      {!rtm && !full && !insufficient && shortfall > 0 && (
        <p className="text-xs text-amber-500">
          Heads up: {selected?.name} will still need {shortfall} more to reach the{" "}
          {squadMin}-player minimum.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {rtm ? (
          <button
            type="button"
            onClick={() =>
              selected &&
              rtmTeam &&
              onSellRtm(rtmTeam.id, selected.id, amount)
            }
            disabled={!canSellRtm}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
            Confirm RTM Sale
          </button>
        ) : (
          <button
            type="button"
            onClick={() => selected && onSell(selected.id, amount)}
            disabled={!canSell}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
            Confirm Sale
          </button>
        )}
        <button
          type="button"
          onClick={onUnsold}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-foreground uppercase transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)] disabled:opacity-50"
        >
          Mark Unsold
        </button>
      </div>
    </div>
  );
}

/** One franchise row in the purse board with its two top-up toggles. */
function TopupRow({
  f,
  squadMax,
  topup1,
  topup2,
  busy,
  onTopup,
}: {
  f: FranchiseView;
  squadMax: number;
  topup1: number;
  topup2: number;
  busy: boolean;
  onTopup: (which: 1 | 2) => void;
}) {
  const pct =
    f.purse_total > 0
      ? Math.max(0, Math.min(100, (f.purse_remaining / f.purse_total) * 100))
      : 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-heading text-sm font-bold tracking-wide text-foreground uppercase">
          {f.short_code ? `${f.short_code} · ` : ""}
          {f.name}
        </span>
        <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {f.squadCount}/{squadMax}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className={cn("h-full rounded-full", pct < 20 ? "bg-[var(--closed)]" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-foreground/90">
          ₹{formatMoney(f.purse_remaining)}
        </span>
        <div className="flex gap-1.5">
          <TopupButton
            used={f.topup_1_used}
            amount={topup1}
            disabled={busy}
            onClick={() => onTopup(1)}
          />
          <TopupButton
            used={f.topup_2_used}
            amount={topup2}
            disabled={busy}
            onClick={() => onTopup(2)}
          />
        </div>
      </div>
    </div>
  );
}

function TopupButton({
  used,
  amount,
  disabled,
  onClick,
}: {
  used: boolean;
  amount: number;
  disabled: boolean;
  onClick: () => void;
}) {
  if (used) {
    return (
      <span className="inline-flex items-center rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[10px] tracking-wider text-accent uppercase">
        +{formatMoney(amount)} ✓
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-0.5 rounded-sm border border-border px-2 py-1 font-mono text-[10px] tracking-wider text-foreground/80 uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
    >
      <Plus className="size-3" />
      {formatMoney(amount)}
    </button>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-heading text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50",
        variant === "danger"
          ? "border-border text-foreground hover:border-[var(--closed)] hover:text-[var(--closed)]"
          : "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}
