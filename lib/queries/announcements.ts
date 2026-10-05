import { createClient } from "@/lib/supabase/server";
import { toTitleCase } from "@/lib/registration";

/** One emailable squad member (a player sold/locked to a franchise). */
export type SquadRecipient = {
  player_id: string;
  name: string;
  email: string | null;
  registration_code: string | null;
  category: string | null;
  price: number;
  acquisition_type: string;
  display_as_owner: boolean;
  franchise_id: string;
  franchise_name: string;
  franchise_code: string | null;
};

type Row = {
  player_id: string;
  acquisition_type: string;
  display_as_owner: boolean | null;
  category_at_acquisition: string | null;
  price: number;
  franchise_id: string;
  players: {
    full_name: string | null;
    email: string | null;
    registration_code: string | null;
    assigned_category: string | null;
  } | null;
  franchises: { name: string | null; short_code: string | null } | null;
};

/**
 * All squad members (sold/locked players) with the franchise they belong to and
 * the contact + category needed to compose a personalised announcement. Admin
 * session required (reads `players` via the admin RLS policy). Pass `playerIds`
 * to restrict to a specific selection (used by the send action to re-fetch
 * authoritative data rather than trusting client-sent values).
 */
export async function getSquadRecipients(
  playerIds?: string[],
): Promise<SquadRecipient[]> {
  const supabase = await createClient();
  let query = supabase
    .from("squad_members")
    .select(
      "player_id, acquisition_type, display_as_owner, category_at_acquisition, price, franchise_id, players(full_name, email, registration_code, assigned_category), franchises(name, short_code)",
    );
  if (playerIds) {
    if (playerIds.length === 0) return [];
    query = query.in("player_id", playerIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getSquadRecipients:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as Row[];
  return rows.map((m) => ({
    player_id: m.player_id,
    name: m.players?.full_name ? toTitleCase(m.players.full_name) : "—",
    email: m.players?.email ?? null,
    registration_code: m.players?.registration_code ?? null,
    category: m.category_at_acquisition ?? m.players?.assigned_category ?? null,
    price: m.price ?? 0,
    acquisition_type: m.acquisition_type,
    display_as_owner: Boolean(m.display_as_owner),
    franchise_id: m.franchise_id,
    franchise_name: m.franchises?.name ?? "—",
    franchise_code: m.franchises?.short_code ?? null,
  }));
}
