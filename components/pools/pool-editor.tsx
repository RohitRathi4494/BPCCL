"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { RotateCcw, ExternalLink, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_POOLS,
  POOL_CHANNEL,
  POOL_LABELS,
  POOL_STORAGE_KEY,
  SLOTS_PER_POOL,
  buildPoolTeams,
  normalisePools,
  type Pools,
} from "@/lib/pools/shared";
import { PoolStage, parseDrag, serializeDrag, type DragPayload } from "./pool-stage";

type FranchiseRow = { name: string; short_code: string | null };

export function PoolEditor({ franchises }: { franchises: FranchiseRow[] }) {
  const teams = useMemo(() => buildPoolTeams(franchises), [franchises]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.code, t])), [teams]);
  const validCodes = useMemo(() => new Set(teams.map((t) => t.code)), [teams]);

  const [pools, setPools] = useState<Pools>(EMPTY_POOLS);
  const poolsRef = useRef(pools);
  useEffect(() => {
    poolsRef.current = pools;
  }, [pools]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [trayOver, setTrayOver] = useState(false);

  // Teams not yet placed in either pool.
  const placed = useMemo(() => {
    const s = new Set<string>();
    for (const c of [...pools.A, ...pools.B]) if (c) s.add(c);
    return s;
  }, [pools]);
  const tray = teams.filter((t) => !placed.has(t.code));

  const broadcast = useCallback((p: Pools) => {
    channelRef.current?.send({ type: "broadcast", event: "state", payload: p });
  }, []);

  // Load saved arrangement + wire the realtime broadcast channel.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POOL_STORAGE_KEY);
      // One-time seed after mount (not during render) so SSR/client markup match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPools(normalisePools(JSON.parse(raw), validCodes));
    } catch {
      /* ignore bad storage */
    }

    const supabase = createClient();
    const channel = supabase.channel(POOL_CHANNEL);
    channel
      // A newly-opened display asks for the current state; reply immediately.
      .on("broadcast", { event: "sync-request" }, () => {
        channel.send({ type: "broadcast", event: "state", payload: poolsRef.current });
      })
      .subscribe();
    channelRef.current = channel;

    // Heartbeat so a display that opens later always catches up within a few s.
    const hb = setInterval(() => {
      channel.send({ type: "broadcast", event: "state", payload: poolsRef.current });
    }, 4000);

    return () => {
      clearInterval(hb);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [validCodes]);

  // Persist + broadcast on every change.
  const apply = useCallback(
    (next: Pools) => {
      setPools(next);
      try {
        localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      broadcast(next);
    },
    [broadcast],
  );

  const placeTeam = useCallback(
    (payload: DragPayload, to: "A" | "B", index: number) => {
      const next: Pools = { A: [...poolsRef.current.A], B: [...poolsRef.current.B] };
      const { code, from, index: fromIndex } = payload;
      if (!validCodes.has(code)) return;
      const displaced = next[to][index];
      if (displaced === code) return; // dropped onto itself

      // Remove the dragged team from wherever it currently sits.
      for (const p of ["A", "B"] as const) {
        const i = next[p].indexOf(code);
        if (i >= 0) next[p][i] = null;
      }
      next[to][index] = code;

      // If the target was occupied: swap back into the source slot (when the
      // drag came from a slot), otherwise the displaced team returns to the tray.
      if (displaced) {
        if (from === "A" || from === "B") next[from][fromIndex] = displaced;
      }
      apply(next);
    },
    [apply, validCodes],
  );

  const removeAt = useCallback(
    (pool: "A" | "B", index: number) => {
      const next: Pools = { A: [...poolsRef.current.A], B: [...poolsRef.current.B] };
      next[pool][index] = null;
      apply(next);
    },
    [apply],
  );

  const reset = useCallback(() => apply(EMPTY_POOLS), [apply]);

  const countA = pools.A.filter(Boolean).length;
  const countB = pools.B.filter(Boolean).length;

  return (
    <div className="flex h-dvh flex-col bg-[#05070f]">
      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a1020] px-4 py-2.5 text-white">
        <span className="font-heading text-sm font-bold tracking-wide uppercase">
          Pool Creation
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-400/15 px-2.5 py-1 font-mono text-xs text-amber-300">
          <Users className="size-3.5" /> {POOL_LABELS.A} {countA}/{SLOTS_PER_POOL}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-sky-400/15 px-2.5 py-1 font-mono text-xs text-sky-300">
          <Users className="size-3.5" /> {POOL_LABELS.B} {countB}/{SLOTS_PER_POOL}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/pools"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-sm border border-white/20 px-3 py-1.5 text-xs text-white/85 transition-colors hover:border-white/50 hover:text-white"
          >
            <ExternalLink className="size-3.5" /> Open display
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-sm border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/15"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="min-h-0 flex-1">
        <PoolStage
          teams={teamMap}
          pools={pools}
          interactive
          onDropTeam={placeTeam}
          onRemove={removeAt}
        />
      </div>

      {/* Team tray — drag these into the shields; drop here to unassign. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setTrayOver(true);
        }}
        onDragLeave={() => setTrayOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setTrayOver(false);
          const payload = parseDrag(e.dataTransfer.getData("text/plain"));
          if (payload && (payload.from === "A" || payload.from === "B")) {
            removeAt(payload.from, payload.index);
          }
        }}
        className={`flex min-h-[112px] items-center gap-3 overflow-x-auto border-t px-4 py-3 transition-colors ${
          trayOver ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-[#0a1020]"
        }`}
      >
        {tray.length === 0 ? (
          <span className="px-2 text-sm text-white/50">
            All teams assigned. Drag a crest here to send it back.
          </span>
        ) : (
          tray.map((t) => (
            <div
              key={t.code}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "text/plain",
                  serializeDrag({ code: t.code, from: "tray", index: -1 }),
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              className="flex w-[84px] flex-none cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
              title={t.name}
            >
              <img
                src={t.logo}
                alt={t.name}
                className="size-14 object-contain drop-shadow"
                draggable={false}
              />
              <span className="line-clamp-1 max-w-full text-center text-[10px] text-white/70">
                {t.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
