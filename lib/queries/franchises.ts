import { createClient } from "@/lib/supabase/server";
import { toTitleCase } from "@/lib/registration";

export type PublicSquadPlayer = {
  name: string;
  category: string | null;
  /** owner | retention | legend | auction (display_as_owner collapses to owner). */
  type: string;
};

export type PublicFranchise = {
  id: string;
  name: string;
  short_code: string | null;
  owner_name: string | null;
  /** Names of the franchise's owners (the setup "owner" locks), in lock order. */
  owners: string[];
  /** The full published squad (no prices), owners/retentions first. */
  squad: PublicSquadPlayer[];
};

// Display order for squad grouping: setup locks first, then auction buys.
const TYPE_RANK: Record<string, number> = {
  owner: 0,
  legend: 1,
  retention: 2,
  auction: 3,
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

  const [{ data: franchises, error: fErr }, { data: members, error: mErr }] =
    await Promise.all([
      supabase
        .from("franchises")
        .select("id, name, short_code, owner_name")
        .order("name"),
      supabase
        .from("squad_members")
        .select(
          "franchise_id, player_id, created_at, acquisition_type, display_as_owner, display_order, category_at_acquisition",
        )
        .order("created_at", { ascending: true }),
    ]);

  if (fErr) {
    console.error("getPublicFranchises:", fErr.message);
    return [];
  }
  if (mErr) {
    // Non-fatal — fall back to no squads, we can still render franchises.
    console.error("getPublicFranchises (members):", mErr.message);
  }

  const memberRows = members ?? [];

  // Resolve player names + categories via the public view (no PII beyond name).
  const playerIds = [...new Set(memberRows.map((m) => m.player_id))];
  const nameById = new Map<string, string>();
  const catById = new Map<string, string | null>();
  if (playerIds.length > 0) {
    const { data: people, error: pErr } = await supabase
      .from("players_public")
      .select("id, full_name, assigned_category")
      .in("id", playerIds);
    if (pErr) {
      console.error("getPublicFranchises (player names):", pErr.message);
    }
    for (const p of people ?? []) {
      if (!p.id) continue;
      if (p.full_name) nameById.set(p.id, toTitleCase(p.full_name));
      catById.set(p.id, p.assigned_category ?? null);
    }
  }

  // Treat a member flagged "display as owner" (e.g. an owner locked in the Legend
  // slot) as an owner for both the owners list and the squad type tag.
  const effectiveType = (m: (typeof memberRows)[number]) =>
    m.display_as_owner ? "owner" : m.acquisition_type;

  const ownersByFranchise = new Map<string, { name: string; order: number }[]>();
  const squadByFranchise = new Map<string, (PublicSquadPlayer & { order: number })[]>();
  for (const m of memberRows) {
    const name = nameById.get(m.player_id);
    if (!name) continue;
    const type = effectiveType(m);
    const order = m.display_order ?? Number.POSITIVE_INFINITY;
    const squad = squadByFranchise.get(m.franchise_id) ?? [];
    squad.push({
      name,
      // Prefer the player's current category so admin category edits show live.
      category: catById.get(m.player_id) ?? m.category_at_acquisition ?? null,
      type,
      order,
    });
    squadByFranchise.set(m.franchise_id, squad);
    if (type === "owner") {
      const list = ownersByFranchise.get(m.franchise_id) ?? [];
      list.push({ name, order });
      ownersByFranchise.set(m.franchise_id, list);
    }
  }

  // Sort each squad: a manual sequence (display_order, lower first) wins; members
  // without one fall back to setup locks first (owner → legend → retention), then
  // auction buys, each group alphabetical by name.
  for (const squad of squadByFranchise.values()) {
    squad.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const r = (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9);
      return r !== 0 ? r : a.name.localeCompare(b.name);
    });
  }
  // Owners list honours the same manual sequence (lower first), then name.
  for (const list of ownersByFranchise.values()) {
    list.sort((a, b) =>
      a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name),
    );
  }

  return (franchises ?? []).map((f) => {
    const locked = (ownersByFranchise.get(f.id) ?? []).map((o) => o.name);
    // Fall back to the single owner_name text field if no owner locks exist.
    const ownerList =
      locked.length > 0
        ? locked
        : f.owner_name
          ? [toTitleCase(f.owner_name)]
          : [];
    // Strip the internal `order` sort key before returning the public shape.
    const squad: PublicSquadPlayer[] = (squadByFranchise.get(f.id) ?? []).map(
      ({ name, category, type }) => ({ name, category, type }),
    );
    return {
      id: f.id,
      name: f.name,
      short_code: f.short_code,
      owner_name: f.owner_name,
      owners: ownerList,
      squad,
    };
  });
}
