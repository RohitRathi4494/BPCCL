"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_POOLS,
  POOL_CHANNEL,
  POOL_STORAGE_KEY,
  buildPoolTeams,
  normalisePools,
  type Pools,
} from "@/lib/pools/shared";
import { PoolStage } from "./pool-stage";

type FranchiseRow = { name: string; short_code: string | null };

/**
 * Read-only public display of the pools. Mirrors the admin editor live over a
 * Supabase Realtime broadcast channel (nothing is stored server-side). On open
 * it asks the editor for the current arrangement, then follows every change.
 */
export function PoolDisplay({ franchises }: { franchises: FranchiseRow[] }) {
  const teams = useMemo(() => buildPoolTeams(franchises), [franchises]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.code, t])), [teams]);
  const validCodes = useMemo(() => new Set(teams.map((t) => t.code)), [teams]);

  const [pools, setPools] = useState<Pools>(EMPTY_POOLS);

  useEffect(() => {
    // Seed from localStorage in case the editor is on this same device/browser.
    try {
      const raw = localStorage.getItem(POOL_STORAGE_KEY);
      // One-time seed after mount (not during render) so SSR/client markup match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPools(normalisePools(JSON.parse(raw), validCodes));
    } catch {
      /* ignore */
    }

    const supabase = createClient();
    const channel = supabase.channel(POOL_CHANNEL);
    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        setPools(normalisePools(payload, validCodes));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "sync-request", payload: {} });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [validCodes]);

  return <PoolStage teams={teamMap} pools={pools} />;
}
