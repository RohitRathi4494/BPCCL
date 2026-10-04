import { createClient } from "@/lib/supabase/server";
import type { PoolPlayer, Wishlist } from "@/lib/types";

export type WishlistEntry = Wishlist & { player: PoolPlayer | null };
export type SquadEntry = {
  player_id: string;
  sold_price: number;
  acquisition_type: string;
  display_as_owner: boolean;
  /** The player's contact number — owner-scoped via the my_squad_contacts RPC. */
  phone: string | null;
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

/**
 * IDs of every player already on a squad (owner / retention / auction), across
 * ALL franchises. Used to drop sold players from the biddable pool.
 */
export async function getSoldPlayerIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("squad_members").select("player_id");
  if (error) {
    console.error("getSoldPlayerIds:", error.message);
    return [];
  }
  return (data ?? []).map((s) => s.player_id);
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

/** The franchise's squad (owner / retention / auction) joined to pool names. */
export async function getSquad(
  franchiseId: string,
  pool: PoolPlayer[],
): Promise<SquadEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("squad_members")
    .select("player_id, price, acquisition_type, display_as_owner")
    .eq("franchise_id", franchiseId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getSquad:", error.message);
    return [];
  }

  // Contact numbers for this franchise's own squad (RLS hides phone on the pool
  // views, so this comes from the owner-scoped my_squad_contacts RPC).
  const phoneById = new Map<string, string | null>();
  const { data: contacts, error: cErr } = await supabase.rpc("my_squad_contacts");
  if (cErr) {
    console.error("getSquad (contacts):", cErr.message);
  }
  for (const c of contacts ?? []) phoneById.set(c.player_id, c.phone);

  const byId = indexPool(pool);
  return (data ?? []).map((s) => ({
    player_id: s.player_id,
    sold_price: s.price,
    acquisition_type: s.acquisition_type,
    display_as_owner: s.display_as_owner ?? false,
    phone: phoneById.get(s.player_id) ?? null,
    player: byId.get(s.player_id) ?? null,
  }));
}
