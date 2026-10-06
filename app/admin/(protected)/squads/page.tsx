import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SquadOrderInput } from "@/components/admin/squad-order-input";

export const metadata: Metadata = {
  title: "All Squads",
  description: "Every franchise's squad, bids, totals and top-ups in one place.",
};

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

type PlayerLite = {
  full_name: string | null;
  assigned_category: string | null;
  phone: string | null;
};

type MemberRow = {
  franchise_id: string;
  player_id: string;
  acquisition_type: string;
  display_as_owner: boolean | null;
  display_order: number | null;
  category_at_acquisition: string | null;
  price: number;
  players: PlayerLite | null;
};

type FranchiseRow = {
  id: string;
  name: string;
  short_code: string | null;
  purse_total: number;
  purse_remaining: number;
  topup_1_used: boolean;
  topup_2_used: boolean;
};

const TYPE_RANK: Record<string, number> = {
  owner: 0,
  legend: 1,
  retention: 2,
  auction: 3,
};

export default async function AdminSquadsPage() {
  const supabase = await createClient();

  const [franchisesR, membersR, approvedR] = await Promise.all([
    supabase
      .from("franchises")
      .select(
        "id, name, short_code, purse_total, purse_remaining, topup_1_used, topup_2_used",
      )
      .order("name", { ascending: true }),
    supabase
      .from("squad_members")
      .select(
        "franchise_id, player_id, acquisition_type, display_as_owner, display_order, category_at_acquisition, price, players(full_name, assigned_category, phone)",
      ),
    supabase
      .from("players")
      .select("id, full_name, assigned_category, phone")
      .eq("status", "approved")
      .order("full_name", { ascending: true }),
  ]);

  const franchises = (franchisesR.data ?? []) as FranchiseRow[];
  const members = (membersR.data ?? []) as unknown as MemberRow[];

  // Group members by franchise.
  const byFranchise = new Map<string, MemberRow[]>();
  const soldIds = new Set<string>();
  for (const m of members) {
    soldIds.add(m.player_id);
    const list = byFranchise.get(m.franchise_id) ?? [];
    list.push(m);
    byFranchise.set(m.franchise_id, list);
  }

  const unsold = (approvedR.data ?? []).filter((p) => !soldIds.has(p.id));

  const effType = (m: MemberRow) =>
    m.display_as_owner ? "owner" : m.acquisition_type;

  // League-wide totals.
  const totalSpent = franchises.reduce(
    (s, f) => s + (f.purse_total - f.purse_remaining),
    0,
  );
  const totalPlayers = members.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
          All Squads
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every franchise&apos;s squad with bid amounts, spend, and top-ups.{" "}
          {franchises.length} teams · {totalPlayers} players · ₹{inr(totalSpent)}{" "}
          total spent.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set a number in the <span className="font-mono">Seq</span> column to
          arrange the order players appear in (lower first — use it to sequence
          owners &amp; legends). Leave it blank to use the default order. Saves
          automatically and updates the public squads page.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {franchises.map((f) => {
          const squad = (byFranchise.get(f.id) ?? []).slice().sort((a, b) => {
            // Manual sequence wins (lower first); unset members fall back to the
            // default ordering (type rank → bid desc).
            const oa = a.display_order ?? Number.POSITIVE_INFINITY;
            const ob = b.display_order ?? Number.POSITIVE_INFINITY;
            if (oa !== ob) return oa - ob;
            const r = (TYPE_RANK[effType(a)] ?? 9) - (TYPE_RANK[effType(b)] ?? 9);
            return r !== 0 ? r : b.price - a.price;
          });
          const spent = f.purse_total - f.purse_remaining;
          return (
            <section
              key={f.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <h2 className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
                  {f.short_code ? `${f.short_code} · ` : ""}
                  {f.name}
                </h2>
                <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                  {squad.length} players
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-xs sm:grid-cols-4">
                <Stat label="Spent" value={`₹${inr(spent)}`} />
                <Stat label="Remaining" value={`₹${inr(f.purse_remaining)}`} />
                <Stat label="Purse" value={`₹${inr(f.purse_total)}`} />
                <Stat
                  label="Top-ups"
                  value={
                    [f.topup_1_used && "1", f.topup_2_used && "2"]
                      .filter(Boolean)
                      .join(" + ") || "none"
                  }
                />
              </div>

              {squad.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No players yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-y border-border bg-background/50 text-left">
                        {["Seq", "Player", "Category", "Type", "Bid"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {squad.map((m) => (
                        <tr
                          key={m.player_id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-4 py-2">
                            <SquadOrderInput
                              playerId={m.player_id}
                              value={m.display_order}
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-foreground">
                            {m.players?.full_name ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {m.players?.assigned_category ??
                              m.category_at_acquisition ??
                              "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                            {effType(m)}
                          </td>
                          <td className="px-4 py-2 font-mono text-foreground">
                            ₹{inr(m.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* ---- Unsold players ---- */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
            Unsold Players
          </h2>
          <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            {unsold.length} remaining
          </span>
        </div>
        {unsold.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            Every approved player was drafted.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50 text-left">
                  {["Player", "Category", "Contact"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unsold.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2 font-medium text-foreground">
                      {p.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {p.assigned_category ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {p.phone ? (
                        <a
                          href={`tel:${p.phone}`}
                          className="text-primary hover:underline"
                        >
                          {p.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
