"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X, Crown, Lock, ArrowLeft, Check, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import {
  formatMoney,
  type AuctionSnapshot,
  type FranchiseView,
  type SquadEntry,
} from "@/lib/auction/snapshot";
import { PlayerSearch, type PoolOption } from "@/components/auction/player-search";

type RpcResult = { ok: boolean; error?: string } | null;

export function AuctionSetup({ initial }: { initial: AuctionSnapshot }) {
  const { data, refetch } = useAuction(initial);
  const supabaseRef = useRef(createClient());
  const [pool, setPool] = useState<PoolOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const available = useMemo(
    () => pool.filter((p) => !soldIds.has(p.id)),
    [pool, soldIds],
  );

  const retentionPrices = data.settings.retentionBasePrice;
  const ownerPrices = data.settings.ownerBasePrice;
  const basePrices = data.settings.basePrice;
  const stepPrices = data.settings.stepPrice;

  async function run(
    key: string,
    fn: () => PromiseLike<{ data: unknown; error: unknown }>,
  ) {
    setError(null);
    setBusyId(key);
    const { data: res, error: err } = await fn();
    setBusyId(null);
    if (err) {
      setError((err as { message?: string }).message ?? "Something went wrong.");
      return;
    }
    const r = res as RpcResult;
    if (r && !r.ok) setError(r.error ?? "Action failed.");
    else await refetch();
  }

  const lock = (franchiseId: string, playerId: string, type: "owner" | "retention") =>
    run(`${franchiseId}:${type}`, () =>
      supabaseRef.current.rpc("lock_squad_member", {
        p_franchise: franchiseId,
        p_player: playerId,
        p_type: type,
      }),
    );

  const unlock = (playerId: string) =>
    run(`unlock:${playerId}`, () =>
      supabaseRef.current.rpc("unlock_squad_member", { p_player: playerId }),
    );

  // Mark / unmark a franchise as a returning Season 1 team (admin RLS on
  // franchises). Only existing teams get an RTM.
  const setSeason1 = (franchiseId: string, value: boolean) =>
    run(`s1:${franchiseId}`, () =>
      supabaseRef.current
        .from("franchises")
        .update({ played_season_1: value })
        .eq("id", franchiseId),
    );

  const savePrices = (
    owner: Record<string, number>,
    retention: Record<string, number>,
  ) => {
    if (!data.settings.id) return;
    return run("base-prices", () =>
      supabaseRef.current
        .from("league_settings")
        .update({ owner_base_price: owner, retention_base_price: retention })
        .eq("id", data.settings.id!),
    );
  };

  const saveBidding = (
    base: Record<string, number>,
    step: Record<string, number>,
  ) => {
    if (!data.settings.id) return;
    return run("bidding-prices", () =>
      supabaseRef.current
        .from("league_settings")
        .update({ base_price: base, step_price: step })
        .eq("id", data.settings.id!),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
            Auction Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            Lock each franchise&apos;s pre-auction squad — up to 3 owners and 2
            retentions. Their per-category base price is deducted from the purse,
            and they count toward the {data.settings.squadMin}-player minimum.
          </p>
        </div>
        <Link
          href="/admin/auction"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
        >
          Live console <ArrowLeft className="size-3.5 rotate-180" />
        </Link>
      </div>

      {/* Owner + retention base-price editor */}
      <BasePricePanel
        key={JSON.stringify([ownerPrices, retentionPrices])}
        categories={data.settings.categories}
        ownerPrices={ownerPrices}
        retentionPrices={retentionPrices}
        busy={busyId === "base-prices"}
        canEdit={!!data.settings.id}
        onSave={savePrices}
      />

      {/* Auction bidding: opening base price + step per category */}
      <BiddingPricePanel
        key={JSON.stringify([basePrices, stepPrices])}
        categories={data.settings.categories}
        basePrices={basePrices}
        stepPrices={stepPrices}
        busy={busyId === "bidding-prices"}
        canEdit={!!data.settings.id}
        onSave={saveBidding}
      />

      {/* Season 1 franchises → RTM eligibility */}
      <Season1Panel
        franchises={data.franchises}
        rtmPerFranchise={data.settings.rtmPerFranchise}
        rtmMaxAgainst={data.settings.rtmMaxAgainst}
        busyId={busyId}
        onToggle={setSeason1}
      />

      {error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.franchises.map((f) => (
          <SetupCard
            key={f.id}
            f={f}
            available={available}
            busyId={busyId}
            squadMin={data.settings.squadMin}
            onLock={lock}
            onUnlock={unlock}
          />
        ))}
      </div>
    </div>
  );
}

/** Admin-editable per-category base prices for owners AND retentions. */
function BasePricePanel({
  categories,
  ownerPrices,
  retentionPrices,
  busy,
  canEdit,
  onSave,
}: {
  categories: string[];
  ownerPrices: Record<string, number>;
  retentionPrices: Record<string, number>;
  busy: boolean;
  canEdit: boolean;
  onSave: (
    owner: Record<string, number>,
    retention: Record<string, number>,
  ) => void;
}) {
  const initOwner = () =>
    Object.fromEntries(categories.map((c) => [c, String(ownerPrices[c] ?? 0)]));
  const initRet = () =>
    Object.fromEntries(categories.map((c) => [c, String(retentionPrices[c] ?? 0)]));
  const [owner, setOwner] = useState<Record<string, string>>(initOwner);
  const [retention, setRetention] = useState<Record<string, string>>(initRet);

  const dirty =
    categories.some((c) => Number(owner[c] || 0) !== (ownerPrices[c] ?? 0)) ||
    categories.some((c) => Number(retention[c] || 0) !== (retentionPrices[c] ?? 0));

  const clean = (draft: Record<string, string>) => {
    const out: Record<string, number> = {};
    for (const c of categories) {
      const n = Number(draft[c]);
      out[c] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    }
    return out;
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Base price per category
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          Owners and retentions are charged separately when locked.
        </span>
      </div>

      <PriceRow
        label="Owner"
        categories={categories}
        draft={owner}
        setDraft={setOwner}
        disabled={!canEdit || busy}
      />
      <PriceRow
        label="Retention"
        categories={categories}
        draft={retention}
        setDraft={setRetention}
        disabled={!canEdit || busy}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(clean(owner), clean(retention))}
          disabled={!canEdit || busy || !dirty}
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Save prices
        </button>
        {!canEdit && (
          <span className="text-xs text-[var(--closed)]">
            League settings row not found — cannot save prices.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Admin-editable per-category AUCTION prices: the opening base price a player
 * goes up at, and the step the bid climbs by on each tap in the live console.
 */
function BiddingPricePanel({
  categories,
  basePrices,
  stepPrices,
  busy,
  canEdit,
  onSave,
}: {
  categories: string[];
  basePrices: Record<string, number>;
  stepPrices: Record<string, number>;
  busy: boolean;
  canEdit: boolean;
  onSave: (
    base: Record<string, number>,
    step: Record<string, number>,
  ) => void;
}) {
  const initBase = () =>
    Object.fromEntries(categories.map((c) => [c, String(basePrices[c] ?? 0)]));
  const initStep = () =>
    Object.fromEntries(categories.map((c) => [c, String(stepPrices[c] ?? 0)]));
  const [base, setBase] = useState<Record<string, string>>(initBase);
  const [step, setStep] = useState<Record<string, string>>(initStep);

  const dirty =
    categories.some((c) => Number(base[c] || 0) !== (basePrices[c] ?? 0)) ||
    categories.some((c) => Number(step[c] || 0) !== (stepPrices[c] ?? 0));

  const clean = (draft: Record<string, string>) => {
    const out: Record<string, number> = {};
    for (const c of categories) {
      const n = Number(draft[c]);
      out[c] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    }
    return out;
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Auction bidding per category
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          Opening bid + how much each tap raises it on the live console.
        </span>
      </div>

      <PriceRow
        label="Base"
        categories={categories}
        draft={base}
        setDraft={setBase}
        disabled={!canEdit || busy}
      />
      <PriceRow
        label="Step"
        categories={categories}
        draft={step}
        setDraft={setStep}
        disabled={!canEdit || busy}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(clean(base), clean(step))}
          disabled={!canEdit || busy || !dirty}
          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Save bidding prices
        </button>
        {!canEdit && (
          <span className="text-xs text-[var(--closed)]">
            League settings row not found — cannot save prices.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Mark which franchises played Season 1. Only these existing teams get an RTM
 * (Right To Match). Shows each team's RTM state live: available / used, and how
 * many RTMs have been used against them (capped at rtmMaxAgainst).
 */
function Season1Panel({
  franchises,
  rtmPerFranchise,
  rtmMaxAgainst,
  busyId,
  onToggle,
}: {
  franchises: FranchiseView[];
  rtmPerFranchise: number;
  rtmMaxAgainst: number;
  busyId: string | null;
  onToggle: (franchiseId: string, value: boolean) => void;
}) {
  const existingCount = franchises.filter((f) => f.played_season_1).length;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          <Repeat className="size-3.5 text-primary" /> Season 1 franchises · RTM
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {existingCount} marked existing · {rtmPerFranchise} RTM each · max{" "}
          {rtmMaxAgainst} against a team
        </span>
      </div>
      <p className="font-mono text-[10px] tracking-wider text-muted-foreground">
        Tick the teams that played Season 1 — only they can exercise an RTM for
        their old players during the auction.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {franchises.map((f) => {
          const busy = busyId === `s1:${f.id}`;
          const rtmSpare = f.played_season_1 && f.rtm_used < rtmPerFranchise;
          return (
            <label
              key={f.id}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-sm border border-border bg-background px-3 py-2"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={f.played_season_1}
                  disabled={busy}
                  onChange={(e) => onToggle(f.id, e.target.checked)}
                  className="size-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="truncate font-heading text-sm font-bold tracking-wide text-foreground uppercase">
                  {f.short_code ? `${f.short_code} · ` : ""}
                  {f.name}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-wider uppercase">
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : f.played_season_1 ? (
                  <span className={rtmSpare ? "text-primary" : "text-muted-foreground"}>
                    {rtmSpare ? "RTM available" : "RTM used"}
                    {f.rtm_against_count > 0 &&
                      ` · ${f.rtm_against_count}/${rtmMaxAgainst} vs`}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">no RTM</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PriceRow({
  label,
  categories,
  draft,
  setDraft,
  disabled,
}: {
  label: string;
  categories: string[];
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <span className="w-20 shrink-0 pb-2 font-mono text-[11px] tracking-[0.16em] text-primary uppercase">
        {label}
      </span>
      {categories.map((c) => (
        <label key={c} className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            {c}
          </span>
          <div className="flex items-center gap-1 rounded-sm border border-input bg-background px-2">
            <span className="text-sm text-muted-foreground">₹</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft[c] ?? ""}
              disabled={disabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [c]: e.target.value }))
              }
              className="w-24 bg-transparent py-2 text-sm text-foreground outline-none disabled:opacity-50"
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function SetupCard({
  f,
  available,
  busyId,
  squadMin,
  onLock,
  onUnlock,
}: {
  f: FranchiseView;
  available: PoolOption[];
  busyId: string | null;
  squadMin: number;
  onLock: (franchiseId: string, playerId: string, type: "owner" | "retention") => void;
  onUnlock: (playerId: string) => void;
}) {
  const owners = f.squad.filter((s) => s.acquisition_type === "owner");
  const retentions = f.squad.filter((s) => s.acquisition_type === "retention");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-heading text-lg font-bold tracking-wide text-foreground uppercase">
          {f.short_code ? `${f.short_code} · ` : ""}
          {f.name}
        </span>
        <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {f.squadCount} locked · min {squadMin}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Purse left
        </span>
        <span className="font-heading text-lg font-bold text-primary">
          ₹{formatMoney(f.purse_remaining)}
        </span>
      </div>

      <LockSection
        label="Owners"
        icon={<Crown className="size-3.5" />}
        cap={3}
        entries={owners}
        available={available}
        busy={busyId === `${f.id}:owner`}
        onAdd={(pid) => onLock(f.id, pid, "owner")}
        onRemove={onUnlock}
      />
      <LockSection
        label="Retentions"
        icon={<Lock className="size-3.5" />}
        cap={2}
        entries={retentions}
        available={available}
        busy={busyId === `${f.id}:retention`}
        onAdd={(pid) => onLock(f.id, pid, "retention")}
        onRemove={onUnlock}
      />
    </div>
  );
}

function LockSection({
  label,
  icon,
  cap,
  entries,
  available,
  busy,
  onAdd,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  cap: number;
  entries: SquadEntry[];
  available: PoolOption[];
  busy: boolean;
  onAdd: (playerId: string) => void;
  onRemove: (playerId: string) => void;
}) {
  const full = entries.length >= cap;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase">
          {label} · {entries.length}/{cap}
        </span>
      </div>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {entries.map((e) => (
            <li
              key={e.player_id}
              className="flex items-center justify-between gap-2 rounded-sm border border-border bg-background px-3 py-1.5"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {e.full_name}
                <span className="ml-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {e.category ?? "—"} · ₹{formatMoney(e.price)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(e.player_id)}
                aria-label={`Remove ${e.full_name}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-[var(--closed)]"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          {label} full
        </p>
      ) : busy ? (
        <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Locking…
        </div>
      ) : (
        <PlayerSearch
          players={available}
          onPick={onAdd}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
        />
      )}
    </div>
  );
}
