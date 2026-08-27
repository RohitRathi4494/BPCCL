"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Play,
  Pause,
  Flag,
  Search,
  ChevronUp,
  Undo2,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import {
  formatMoney,
  type AuctionSnapshot,
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
};
type RpcResult = { ok: boolean; error?: string } | null;

export function AuctioneerConsole({ initial }: { initial: AuctionSnapshot }) {
  const { data, live, refetch } = useAuction(initial);
  const supabaseRef = useRef(createClient());
  const [pool, setPool] = useState<PoolPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabaseRef.current
        .from("players")
        .select("id, full_name, role, assigned_category")
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

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter(
      (p) =>
        !soldIds.has(p.id) &&
        p.id !== data.state.current_player_id &&
        (!category || p.assigned_category === category) &&
        (!q || p.full_name.toLowerCase().includes(q)),
    );
  }, [pool, soldIds, data.state.current_player_id, category, query]);

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
  const setCategory = (c: string) =>
    updateState({ current_category: c === category ? null : c });
  const putUp = (playerId: string) =>
    updateState({
      current_player_id: playerId,
      current_result: null,
      current_result_franchise_id: null,
      current_result_amount: null,
      status: "in_progress",
    });

  const undo = () =>
    callRpc(() => supabaseRef.current.rpc("undo_last_action"));
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
          {status !== "completed" && (
            <ControlButton
              onClick={() => setStatus("completed")}
              disabled={busy}
              variant="danger"
            >
              <Flag className="size-4" /> Complete
            </ControlButton>
          )}
        </div>
      </div>

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
              <SellPanel
                key={onBlock.id}
                franchises={data.franchises}
                squadMax={data.settings.squadMax}
                squadMin={data.settings.squadMin}
                busy={busy}
                onSell={(fid, amt) => sell(onBlock.id, fid, amt)}
                onUnsold={() => markUnsold(onBlock.id)}
              />
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
                {category ? `${category} · ` : "Pool · "}
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
            <div className="mt-3 max-h-96 overflow-y-auto">
              {available.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {pool.length === 0
                    ? "No approved players yet — approve players in the registrations dashboard first."
                    : category
                      ? "No available players in this category."
                      : "Select a category to begin, or search by name."}
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
                      <button
                        type="button"
                        onClick={() => putUp(p.id)}
                        disabled={busy || status === "completed"}
                        className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-primary px-3 py-1.5 text-xs font-bold text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                      >
                        <ChevronUp className="size-3.5" /> Put up
                      </button>
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

/** Sale entry: amount + franchise select + guardrails. */
function SellPanel({
  franchises,
  squadMax,
  squadMin,
  busy,
  onSell,
  onUnsold,
}: {
  franchises: FranchiseView[];
  squadMax: number;
  squadMin: number;
  busy: boolean;
  onSell: (franchiseId: string, amount: number) => void;
  onUnsold: () => void;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [franchiseId, setFranchiseId] = useState("");

  const amount = Number(amountStr);
  const validAmount = amountStr.trim() !== "" && Number.isFinite(amount) && amount >= 0;
  const selected = franchises.find((f) => f.id === franchiseId) ?? null;

  const full = selected ? selected.squadCount >= squadMax : false;
  const insufficient = selected && validAmount ? selected.purse_remaining < amount : false;
  const canSell = !!selected && validAmount && !full && !insufficient && !busy;

  // Soft warning: this franchise will still be below the squad minimum.
  const shortfall =
    selected && selected.squadCount + 1 < squadMin
      ? squadMin - (selected.squadCount + 1)
      : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/5 p-5">
      <h3 className="font-mono text-[11px] tracking-[0.24em] text-accent uppercase">
        Record Sale
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Final amount (₹)
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="e.g. 12000"
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Winning franchise
          </span>
          <select
            value={franchiseId}
            onChange={(e) => setFranchiseId(e.target.value)}
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

      {full && (
        <p className="text-xs text-[var(--closed)]">
          {selected?.name} is already at the squad maximum ({squadMax}). Cannot buy.
        </p>
      )}
      {insufficient && (
        <p className="text-xs text-[var(--closed)]">
          {selected?.name} only has ₹{formatMoney(selected?.purse_remaining)} left —
          not enough for ₹{formatMoney(amount)}.
        </p>
      )}
      {!full && !insufficient && shortfall > 0 && (
        <p className="text-xs text-amber-500">
          Heads up: {selected?.name} will still need {shortfall} more to reach the{" "}
          {squadMin}-player minimum.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => selected && onSell(selected.id, amount)}
          disabled={!canSell}
          className="inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
          Confirm Sale
        </button>
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
