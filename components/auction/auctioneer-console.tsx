"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Pause, Flag, Search, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import type { TablesUpdate } from "@/lib/types";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { PurseBars } from "@/components/auction/purse-bars";
import { RecentSales } from "@/components/auction/recent-sales";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";

type PoolPlayer = {
  id: string;
  full_name: string;
  role: string | null;
  assigned_category: string | null;
};

export function AuctioneerConsole({ initial }: { initial: AuctionSnapshot }) {
  const { data, live, refetch } = useAuction(initial);
  const supabaseRef = useRef(createClient());
  const [pool, setPool] = useState<PoolPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approved-player pool (admin-readable). Fetched client-side via the admin session.
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

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter(
      (p) =>
        !soldIds.has(p.id) &&
        p.id !== data.state.current_player_id &&
        (!q ||
          p.full_name.toLowerCase().includes(q) ||
          (p.assigned_category ?? "").toLowerCase().includes(q)),
    );
  }, [pool, soldIds, data.state.current_player_id, query]);

  const stateId = data.state.id;

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

  const setStatus = (status: string) => updateState({ status });
  const putUp = (playerId: string) =>
    updateState({
      current_player_id: playerId,
      current_bid: null,
      current_bid_franchise_id: null,
      status: "in_progress",
    });
  const markUnsold = () =>
    updateState({
      current_player_id: null,
      current_bid: null,
      current_bid_franchise_id: null,
    });

  async function sell() {
    setError(null);
    setBusy(true);
    const { data: res, error: err } = await supabaseRef.current.rpc("sell_current_player");
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    const r = res as unknown as { ok: boolean; error?: string } | null;
    if (r && !r.ok) setError(r.error ?? "Could not finalise sale.");
    else await refetch();
  }

  const status = data.state.status;
  const hasBid = data.state.current_bid != null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
            Auctioneer Console
          </h1>
          <div className="flex items-center gap-3">
            <AuctionStatusPill status={status} />
            <span className="font-mono text-xs text-muted-foreground uppercase">
              Round {data.state.round}
            </span>
            <LiveBadge live={live} />
          </div>
        </div>

        {/* Run controls */}
        <div className="flex flex-wrap gap-2">
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
            <ControlButton onClick={() => setStatus("completed")} disabled={busy} variant="danger">
              <Flag className="size-4" /> End
            </ControlButton>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: current player + sell/unsold + pool */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CurrentPlayerCard snapshot={data} />

          {data.currentPlayer && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={sell}
                disabled={busy || !hasBid}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-3 font-heading text-sm font-bold tracking-wide text-accent-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
                Sell {hasBid ? `· ${formatMoney(data.state.current_bid)}` : ""}
              </button>
              <button
                type="button"
                onClick={markUnsold}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3 font-heading text-sm font-bold tracking-wide text-foreground uppercase transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)] disabled:opacity-50"
              >
                Unsold / Skip
              </button>
            </div>
          )}

          {/* Player pool */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
                Player Pool · {available.length}
              </h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or grade…"
                  className="w-full rounded-sm border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-3 max-h-96 overflow-y-auto">
              {available.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {pool.length === 0
                    ? "No approved players yet — approve players in the registrations dashboard first."
                    : "No matching players in the pool."}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {available.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{p.full_name}</p>
                        <p className="truncate font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          {p.assigned_category ?? "—"} · {p.role}
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

        {/* Right: purses + recent sales */}
        <div className="flex flex-col gap-6">
          <RecentSales snapshot={data} />
          <div>
            <h3 className="mb-3 font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
              Purses
            </h3>
            <PurseBars snapshot={data} columns={1} />
          </div>
        </div>
      </div>
    </div>
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
      className={
        "inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-heading text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 " +
        (variant === "danger"
          ? "border-border text-foreground hover:border-[var(--closed)] hover:text-[var(--closed)]"
          : "border-primary text-primary hover:bg-primary hover:text-primary-foreground")
      }
    >
      {children}
    </button>
  );
}
