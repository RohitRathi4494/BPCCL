import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** One acquired player on a franchise (owner / retention / auction). */
export type SquadEntry = {
  player_id: string;
  full_name: string;
  price: number;
  acquisition_type: "owner" | "retention" | "legend" | "auction";
  category: string | null;
};

export type FranchiseView = {
  id: string;
  name: string;
  short_code: string | null;
  purse_total: number;
  purse_remaining: number;
  topup_1_used: boolean;
  topup_2_used: boolean;
  played_season_1: boolean;
  rtm_used: number;
  rtm_against_count: number;
  squad: SquadEntry[];
  squadCount: number;
};

/** The player currently "on the block" — rich fields for the big screen. */
export type CurrentPlayer = {
  id: string;
  full_name: string;
  photo_url: string | null;
  assigned_category: string | null;
  age: number | null;
  jersey_number: string | null;
  role: string | null;
  roles: string[];
  batting_style: string | null;
  bowling_style: string | null;
  cricheroes_url: string | null;
  stats: { label: string; value: string }[];
};

/** The result overlay for the on-block player. */
export type SaleResult = {
  status: "sold" | "unsold" | null;
  franchise_id: string | null;
  franchise_name: string | null;
  franchise_short_code: string | null;
  amount: number | null;
  via_rtm: boolean;
};

/** The live "current highest bid" while a player is on the block. */
export type CurrentBid = {
  amount: number | null;
  franchise_id: string | null;
  franchise_name: string | null;
  franchise_short_code: string | null;
};

export type AuctionSnapshot = {
  state: {
    id: string | null;
    status: string; // setup | in_progress | paused | completed
    current_player_id: string | null;
    current_category: string | null;
  };
  currentPlayer: CurrentPlayer | null;
  currentBid: CurrentBid;
  result: SaleResult;
  franchises: FranchiseView[];
  recentSales: {
    player_name: string;
    franchise_name: string;
    franchise_short_code: string | null;
    price: number;
  }[];
  settings: {
    id: string | null;
    categories: string[];
    retentionBasePrice: Record<string, number>;
    ownerBasePrice: Record<string, number>;
    legendBasePrice: Record<string, number>;
    basePrice: Record<string, number>;
    stepPrice: Record<string, number>;
    bidIncrement: number;
    defaultPurse: number;
    squadMin: number;
    squadMax: number;
    topup1: number;
    topup2: number;
    rtmPerFranchise: number;
    rtmMaxAgainst: number;
  };
};

/** Format a mock-currency integer with Indian digit grouping. */
export function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

const EMPTY_STATE = {
  id: null,
  status: "setup",
  current_player_id: null,
  current_category: null,
};

// The self-reported career stats we surface on the big screen, in order.
const STAT_LABELS: { key: keyof StatsRow; label: string }[] = [
  { key: "matches_played", label: "Matches" },
  { key: "runs_scored", label: "Runs" },
  { key: "batting_average", label: "Bat Avg" },
  { key: "batting_strike_rate", label: "Bat SR" },
  { key: "wickets_taken", label: "Wickets" },
  { key: "economy", label: "Econ" },
];

type StatsRow = {
  matches_played: string | null;
  runs_scored: string | null;
  batting_average: string | null;
  batting_strike_rate: string | null;
  wickets_taken: string | null;
  bowling_strike_rate: string | null;
  economy: string | null;
};

type PublicPlayer = {
  id: string | null;
  full_name: string | null;
  photo_url: string | null;
  role: string | null;
  roles: string[] | null;
  assigned_category: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  cricheroes_url: string | null;
  age: number | null;
  jersey_number: string | null;
} & StatsRow;

/**
 * Assemble the full read model for the auction room from public tables +
 * the players_public view. Works with either the server or browser client.
 */
export async function fetchAuctionSnapshot(
  supabase: SupabaseClient<Database>,
): Promise<AuctionSnapshot> {
  const [stateR, settingsR, franchisesR, membersR, playersR] = await Promise.all([
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
      .from("squad_members")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("players_public").select("*"),
  ]);

  const stateRow = stateR.data;
  const state = stateRow
    ? {
        id: stateRow.id,
        status: stateRow.status,
        current_player_id: stateRow.current_player_id,
        current_category: stateRow.current_category,
      }
    : { ...EMPTY_STATE };

  const settingsRow = settingsR.data;
  const categories = Array.isArray(settingsRow?.categories)
    ? (settingsRow!.categories as string[])
    : [];
  const retentionBasePrice = (settingsRow?.retention_base_price ?? {}) as Record<
    string,
    number
  >;
  const ownerBasePrice = (settingsRow?.owner_base_price ?? {}) as Record<
    string,
    number
  >;
  const legendBasePrice = (settingsRow?.legend_base_price ?? {}) as Record<
    string,
    number
  >;
  const basePrice = (settingsRow?.base_price ?? {}) as Record<string, number>;
  const stepPrice = (settingsRow?.step_price ?? {}) as Record<string, number>;

  const players = (playersR.data ?? []) as PublicPlayer[];
  const byId = new Map<string, PublicPlayer>();
  for (const p of players) if (p.id) byId.set(p.id, p);

  const members = membersR.data ?? [];
  const franchises: FranchiseView[] = (franchisesR.data ?? []).map((f) => {
    const squad: SquadEntry[] = members
      .filter((m) => m.franchise_id === f.id)
      .map((m) => ({
        player_id: m.player_id,
        full_name: byId.get(m.player_id)?.full_name ?? "Player",
        price: m.price,
        acquisition_type: m.acquisition_type as SquadEntry["acquisition_type"],
        category: m.category_at_acquisition,
      }));
    return {
      id: f.id,
      name: f.name,
      short_code: f.short_code,
      purse_total: f.purse_total,
      purse_remaining: f.purse_remaining,
      topup_1_used: f.topup_1_used,
      topup_2_used: f.topup_2_used,
      played_season_1: f.played_season_1 ?? false,
      rtm_used: f.rtm_used ?? 0,
      rtm_against_count: f.rtm_against_count ?? 0,
      squad,
      squadCount: squad.length,
    };
  });

  const franchiseNameById = new Map(franchises.map((f) => [f.id, f.name]));
  const franchiseCodeById = new Map(franchises.map((f) => [f.id, f.short_code]));
  const recentSales = members
    .filter((m) => m.acquisition_type === "auction")
    .slice(0, 8)
    .map((m) => ({
      player_name: byId.get(m.player_id)?.full_name ?? "Player",
      franchise_name: franchiseNameById.get(m.franchise_id) ?? "—",
      franchise_short_code: franchiseCodeById.get(m.franchise_id) ?? null,
      price: m.price,
    }));

  let currentPlayer: CurrentPlayer | null = null;
  if (state.current_player_id) {
    const p = byId.get(state.current_player_id);
    if (p) {
      currentPlayer = {
        id: state.current_player_id,
        full_name: p.full_name ?? "Player",
        photo_url: p.photo_url,
        assigned_category: p.assigned_category,
        age: p.age ?? null,
        jersey_number: p.jersey_number ?? null,
        role: p.role,
        roles: p.roles ?? [],
        batting_style: p.batting_style,
        bowling_style: p.bowling_style,
        cricheroes_url: p.cricheroes_url,
        stats: STAT_LABELS.map(({ key, label }) => ({
          label,
          value: (p[key] ?? "").toString().trim() || "—",
        })).filter((s) => s.value !== "—"),
      };
    }
  }

  const currentBid: CurrentBid = {
    amount: stateRow?.current_bid ?? null,
    franchise_id: stateRow?.current_bid_franchise_id ?? null,
    franchise_name: stateRow?.current_bid_franchise_id
      ? franchiseNameById.get(stateRow.current_bid_franchise_id) ?? null
      : null,
    franchise_short_code: stateRow?.current_bid_franchise_id
      ? franchiseCodeById.get(stateRow.current_bid_franchise_id) ?? null
      : null,
  };

  const result: SaleResult = {
    status: (stateRow?.current_result as SaleResult["status"]) ?? null,
    franchise_id: stateRow?.current_result_franchise_id ?? null,
    franchise_name: stateRow?.current_result_franchise_id
      ? franchiseNameById.get(stateRow.current_result_franchise_id) ?? null
      : null,
    franchise_short_code: stateRow?.current_result_franchise_id
      ? franchiseCodeById.get(stateRow.current_result_franchise_id) ?? null
      : null,
    amount: stateRow?.current_result_amount ?? null,
    via_rtm: stateRow?.current_result_via_rtm ?? false,
  };

  return {
    state,
    currentPlayer,
    currentBid,
    result,
    franchises,
    recentSales,
    settings: {
      id: settingsRow?.id ?? null,
      categories,
      retentionBasePrice,
      ownerBasePrice,
      legendBasePrice,
      basePrice,
      stepPrice,
      bidIncrement: settingsRow?.bid_increment ?? 0,
      defaultPurse: settingsRow?.default_purse ?? 175000,
      squadMin: settingsRow?.squad_min ?? 18,
      squadMax: settingsRow?.squad_max ?? 25,
      topup1: settingsRow?.topup_1 ?? 50000,
      topup2: settingsRow?.topup_2 ?? 25000,
      rtmPerFranchise: settingsRow?.rtm_per_franchise ?? 1,
      rtmMaxAgainst: settingsRow?.rtm_max_against ?? 2,
    },
  };
}
