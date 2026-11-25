/**
 * Shared TypeScript types for the Ballpark platform.
 *
 * `database.types.ts` is generated from the live Supabase schema. Regenerate it
 * after every migration with:
 *
 *   npx supabase gen types typescript --linked > lib/database.types.ts
 *
 * Import table row types from here (e.g. `import type { Player } from "@/lib/types"`)
 * rather than reaching into the generated file directly.
 */
import type { Database } from "@/lib/database.types";

export type { Database } from "@/lib/database.types";

// Convenience aliases for table shapes: Tables<"players"> etc.
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Named row types for the most-used tables.
export type LeagueSettings = Tables<"league_settings">;
export type Franchise = Tables<"franchises">;
export type Profile = Tables<"profiles">;
export type Player = Tables<"players">;
export type AuctionState = Tables<"auction_state">;
export type Bid = Tables<"bids">;
export type Squad = Tables<"squads">;
export type SquadMember = Tables<"squad_members">;
export type AuctionLog = Tables<"auction_log">;
export type Match = Tables<"matches">;
export type Innings = Tables<"innings">;
export type Ball = Tables<"balls">;
export type Sponsor = Tables<"sponsors">;
export type Wishlist = Tables<"wishlists">;
export type GroundMedia = Tables<"ground_media">;
export type Legend = Tables<"legends">;
export type Reel = Tables<"reels">;
export type Client = Tables<"clients">;
export type GroundFact = Tables<"ground_facts">;
export type Faq = Tables<"faqs">;

// View row: an approved player with evaluation columns (stats + cricheroes).
export type PoolPlayer = Database["public"]["Views"]["players_pool"]["Row"];
