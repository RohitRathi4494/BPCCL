import { createClient } from "@/lib/supabase/server";
import type { PoolPlayer, Wishlist } from "@/lib/types";

export type WishlistEntry = Wishlist & { player: PoolPlayer | null };
export type SquadEntry = {
  player_id: string;
  sold_price: number;
  round: number;
  player: PoolPlayer | null;
};

/** All approved players with evaluation columns (stats + CricHeroes link). */
export async function getApprovedPool(): Promise<PoolPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players_pool")
    .select("*")
    .order("full_name");
  if (error) {
    console.error("getApprovedPool:", error.message);
    return [];
  }
  return data ?? [];
}

/** Build a lookup of pool players by id for joining wishlist/squad rows. */
function indexPool(pool: PoolPlayer[]): Map<string, PoolPlayer> {
  return new Map(pool.filter((p) => p.id).map((p) => [p.id as string, p]));
}

/** The calling franchise owner's wishlist (RLS scopes it to their franchise). */
export async function getWishlist(pool: PoolPlayer[]): Promise<WishlistEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getWishlist:", error.message);
    return [];
  }
  const byId = indexPool(pool);
  return (data ?? []).map((w) => ({ ...w, player: byId.get(w.player_id) ?? null }));
}

/** The franchise's bought squad (public-readable squads joined to pool names). */
export async function getSquad(
  franchiseId: string,
  pool: PoolPlayer[],
): Promise<SquadEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("squads")
    .select("player_id, sold_price, round")
    .eq("franchise_id", franchiseId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getSquad:", error.message);
    return [];
  }
  const byId = indexPool(pool);
  return (data ?? []).map((s) => ({
    player_id: s.player_id,
    sold_price: s.sold_price,
    round: s.round,
    player: byId.get(s.player_id) ?? null,
  }));
}
