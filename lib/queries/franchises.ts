import { createClient } from "@/lib/supabase/server";

export type PublicFranchise = {
  id: string;
  name: string;
  short_code: string | null;
  owner_name: string | null;
  /** Names of the franchise's owners (the setup "owner" locks), in lock order. */
  owners: string[];
};

/**
 * All franchises for the public Franchises page. `franchises` is anon-readable
 * (RLS: "franchises public read"), so no auth is required. Ordered by name for a
 * stable, alphabetical grid.
 *
 * Owners are the `owner` squad locks set during auction setup (up to 3 per
 * franchise). `squad_members` is anon-readable, and owner player names come from
 * the `players_public` view (both public) — we join the two in JS because the
 * underlying `players` table is not anon-readable, so PostgREST can't embed it.
 */
export async function getPublicFranchises(): Promise<PublicFranchise[]> {
  const supabase = await createClient();

  const [{ data: franchises, error: fErr }, { data: owners, error: oErr }] =
    await Promise.all([
      supabase
        .from("franchises")
        .select("id, name, short_code, owner_name")
        .order("name"),
      supabase
        .from("squad_members")
        .select("franchise_id, player_id, created_at")
        .eq("acquisition_type", "owner")
        .order("created_at", { ascending: true }),
    ]);

  if (fErr) {
    console.error("getPublicFranchises:", fErr.message);
    return [];
  }
  if (oErr) {
    // Non-fatal — fall back to no owner locks, we can still render franchises.
    console.error("getPublicFranchises (owners):", oErr.message);
  }

  // Resolve owner player names via the public view (no PII beyond full_name).
  const ownerRows = owners ?? [];
  const playerIds = [...new Set(ownerRows.map((o) => o.player_id))];
  const nameById = new Map<string, string>();
  if (playerIds.length > 0) {
    const { data: people, error: pErr } = await supabase
      .from("players_public")
      .select("id, full_name")
      .in("id", playerIds);
    if (pErr) {
      console.error("getPublicFranchises (owner names):", pErr.message);
    }
    for (const p of people ?? []) {
      if (p.id && p.full_name) nameById.set(p.id, p.full_name);
    }
  }

  const ownersByFranchise = new Map<string, string[]>();
  for (const o of ownerRows) {
    const name = nameById.get(o.player_id);
    if (!name) continue;
    const list = ownersByFranchise.get(o.franchise_id) ?? [];
    list.push(name);
    ownersByFranchise.set(o.franchise_id, list);
  }

  return (franchises ?? []).map((f) => {
    const locked = ownersByFranchise.get(f.id) ?? [];
    // Fall back to the single owner_name text field if no owner locks exist.
    const ownerList =
      locked.length > 0 ? locked : f.owner_name ? [f.owner_name] : [];
    return {
      id: f.id,
      name: f.name,
      short_code: f.short_code,
      owner_name: f.owner_name,
      owners: ownerList,
    };
  });
}
