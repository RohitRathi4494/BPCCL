import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type SquadMember = {
  player_id: string;
  full_name: string;
  sold_price: number;
};

export type FranchiseView = {
  id: string;
  name: string;
  short_code: string | null;
  purse_total: number;
  purse_remaining: number;
  squad: SquadMember[];
};

export type CurrentPlayer = {
  id: string;
  full_name: string;
  photo_url: string | null;
  role: string | null;
  assigned_category: string | null;
  base_price: number;
};

export type AuctionSnapshot = {
  state: {
    id: string | null;
    status: string;
    round: number;
    current_player_id: string | null;
    current_bid: number | null;
    current_bid_franchise_id: string | null;
  };
  currentPlayer: CurrentPlayer | null;
  nextBid: number | null;
  franchises: FranchiseView[];
  recentSales: {
    player_name: string;
    franchise_name: string;
    sold_price: number;
  }[];
  settings: {
    bidIncrement: number;
    squadMin: number;
    squadMax: number;
    purse: number;
  };
};

/** Format a mock-currency integer with Indian digit grouping. */
export function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

const EMPTY_STATE = {
  id: null,
  status: "not_started",
  round: 1,
  current_player_id: null,
  current_bid: null,
  current_bid_franchise_id: null,
};

/**
 * Assemble the full read model for the auction room from public tables +
 * the players_public view. Works with either the server or browser client.
 */
export async function fetchAuctionSnapshot(
  supabase: SupabaseClient<Database>,
): Promise<AuctionSnapshot> {
  const [stateR, settingsR, franchisesR, squadsR, playersR] = await Promise.all([
    supabase
      .from("auction_state")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("league_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("franchises").select("*").order("name", { ascending: true }),
    supabase
      .from("squads")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("players_public").select("*"),
  ]);

  const stateRow = stateR.data;
  const state = stateRow
    ? {
        id: stateRow.id,
        status: stateRow.status,
        round: stateRow.round,
        current_player_id: stateRow.current_player_id,
        current_bid: stateRow.current_bid,
        current_bid_franchise_id: stateRow.current_bid_franchise_id,
      }
    : { ...EMPTY_STATE };

  const settingsRow = settingsR.data;
  const basePrices = (settingsRow?.base_price ?? {}) as Record<string, number>;
  const increment = settingsRow?.bid_increment ?? 1;

  const players = playersR.data ?? [];
  const nameById = new Map<string, { full_name: string; photo_url: string | null; role: string | null; assigned_category: string | null }>();
  for (const p of players) {
    if (p.id) {
      nameById.set(p.id, {
        full_name: p.full_name ?? "",
        photo_url: p.photo_url,
        role: p.role,
        assigned_category: p.assigned_category,
      });
    }
  }

  const squads = squadsR.data ?? [];
  const franchises: FranchiseView[] = (franchisesR.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    short_code: f.short_code,
    purse_total: f.purse_total,
    purse_remaining: f.purse_remaining,
    squad: squads
      .filter((s) => s.franchise_id === f.id)
      .map((s) => ({
        player_id: s.player_id,
        full_name: nameById.get(s.player_id)?.full_name ?? "Player",
        sold_price: s.sold_price,
      })),
  }));

  const franchiseNameById = new Map(franchises.map((f) => [f.id, f.name]));
  const recentSales = squads.slice(0, 8).map((s) => ({
    player_name: nameById.get(s.player_id)?.full_name ?? "Player",
    franchise_name: franchiseNameById.get(s.franchise_id) ?? "—",
    sold_price: s.sold_price,
  }));

  let currentPlayer: CurrentPlayer | null = null;
  let nextBid: number | null = null;
  if (state.current_player_id) {
    const p = nameById.get(state.current_player_id);
    const base = p?.assigned_category
      ? Number(basePrices[p.assigned_category] ?? 0)
      : 0;
    currentPlayer = {
      id: state.current_player_id,
      full_name: p?.full_name ?? "Player",
      photo_url: p?.photo_url ?? null,
      role: p?.role ?? null,
      assigned_category: p?.assigned_category ?? null,
      base_price: base,
    };
    nextBid =
      state.current_bid == null
        ? base > 0
          ? base
          : increment
        : state.current_bid + increment;
  }

  return {
    state,
    currentPlayer,
    nextBid,
    franchises,
    recentSales,
    settings: {
      bidIncrement: increment,
      squadMin: settingsRow?.squad_min_per_franchise ?? 15,
      squadMax: settingsRow?.squad_max_per_franchise ?? 18,
      purse: settingsRow?.purse_per_franchise ?? 0,
    },
  };
}
