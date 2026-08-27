"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAuctionSnapshot, type AuctionSnapshot } from "@/lib/auction/snapshot";

/**
 * Subscribes to the auction tables and keeps a fresh snapshot in state. Any
 * change to auction_state / franchises / squad_members triggers a debounced
 * refetch, so every console updates within ~1s (the realtime requirement).
 */
export function useAuction(initial: AuctionSnapshot) {
  const [data, setData] = useState<AuctionSnapshot>(initial);
  const [live, setLive] = useState(false);
  const supabaseRef = useRef(createClient());

  const refetch = useCallback(async () => {
    setData(await fetchAuctionSnapshot(supabaseRef.current));
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 150);
    };

    const channel = supabase
      .channel("auction-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "franchises" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members" }, schedule)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { data, live, refetch };
}
