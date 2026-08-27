"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X, Crown, Lock, ArrowLeft } from "lucide-react";
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

      {/* Retention base-price legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Retention base price
        </span>
        {data.settings.categories.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-xs"
          >
            <span className="font-mono tracking-wider text-muted-foreground uppercase">
              {c}
            </span>
            <span className="font-heading font-bold text-foreground">
              ₹{formatMoney(retentionPrices[c] ?? 0)}
            </span>
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          Set these in league settings if they show ₹0.
        </span>
      </div>

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
