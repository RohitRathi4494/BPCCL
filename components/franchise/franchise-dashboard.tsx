"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Heart,
  Loader2,
  Search,
  Trash2,
  Check,
  Users,
  Wallet,
} from "lucide-react";
import {
  addToWishlist,
  removeFromWishlist,
  updateWishlist,
} from "@/app/franchise/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PoolPlayer } from "@/lib/types";
import type { WishlistEntry, SquadEntry } from "@/lib/queries/franchise";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

type Franchise = {
  id: string;
  name: string;
  purse_total: number;
  purse_remaining: number;
};

type Tab = "pool" | "wishlist" | "squad";

/** Compact, non-empty stat chips for a player. */
function StatLine({ p }: { p: PoolPlayer }) {
  const stats: [string, string | null][] = [
    ["M", p.matches_played],
    ["Runs", p.runs_scored],
    ["Avg", p.batting_average],
    ["SR", p.batting_strike_rate],
    ["Wkts", p.wickets_taken],
    ["Bowl SR", p.bowling_strike_rate],
    ["Econ", p.economy],
  ];
  const shown = stats.filter(([, v]) => v && v.trim() && v.trim() !== "NA");
  if (shown.length === 0)
    return <span className="text-xs text-muted-foreground">No stats provided</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {shown.map(([label, v]) => (
        <span key={label}>
          <span className="text-muted-foreground/60">{label}</span>{" "}
          <span className="font-medium text-foreground/90">{v}</span>
        </span>
      ))}
    </div>
  );
}

function Roles({ roles }: { roles: string[] | null }) {
  if (!roles || roles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground/80"
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function CricLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[11px] tracking-wider text-primary uppercase hover:underline"
    >
      CricHeroes <ExternalLink className="size-3" />
    </a>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="rounded-sm border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-accent uppercase">
      {category}
    </span>
  );
}

export function FranchiseDashboard({
  franchise,
  pool,
  wishlist,
  squad,
}: {
  franchise: Franchise;
  pool: PoolPlayer[];
  wishlist: WishlistEntry[];
  squad: SquadEntry[];
}) {
  const [tab, setTab] = useState<Tab>("pool");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const wishlistIds = useMemo(
    () => new Set(wishlist.map((w) => w.player_id)),
    [wishlist],
  );

  // Live squad: refresh the server data when this franchise's squads change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`franchise-squad-${franchise.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "squads",
          filter: `franchise_id=eq.${franchise.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [franchise.id, router]);

  const filteredPool = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((p) => (p.full_name ?? "").toLowerCase().includes(q));
  }, [pool, query]);

  const spent = squad.reduce((sum, s) => sum + s.sold_price, 0);

  const act = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pool", label: "Player Pool", count: pool.length },
    { key: "wishlist", label: "Wishlist", count: wishlist.length },
    { key: "squad", label: "My Squad", count: squad.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={Wallet} label="Purse Remaining" value={`₹${inr(franchise.purse_remaining)}`} sub={`of ₹${inr(franchise.purse_total)}`} />
        <Tile icon={Users} label="Squad" value={String(squad.length)} sub={`₹${inr(spent)} spent`} />
        <Tile icon={Heart} label="Wishlist" value={String(wishlist.length)} sub="players shortlisted" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-sm border px-3.5 py-1.5 text-sm transition-colors",
              tab === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground/80 hover:border-primary/40",
            )}
          >
            {t.label}
            <span className="font-mono text-xs text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ---- Player Pool ---- */}
      {tab === "pool" && (
        <div className="flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search approved players…"
              className="w-full rounded-sm border border-input bg-background py-2.5 pr-3.5 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {filteredPool.length === 0 ? (
            <Empty>No approved players match your search.</Empty>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredPool.map((p) => {
                const onList = wishlistIds.has(p.id ?? "");
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {p.full_name}
                          </span>
                          <CategoryBadge category={p.assigned_category} />
                        </div>
                        <Roles roles={p.roles} />
                      </div>
                      <button
                        disabled={pending || onList || !p.id}
                        onClick={() => p.id && act(() => addToWishlist(p.id!))}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-70",
                          onList
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-border text-foreground hover:border-primary hover:text-primary",
                        )}
                      >
                        {onList ? (
                          <>
                            <Check className="size-3.5" /> On wishlist
                          </>
                        ) : (
                          <>
                            <Heart className="size-3.5" /> Wishlist
                          </>
                        )}
                      </button>
                    </div>
                    <StatLine p={p} />
                    <CricLink url={p.cricheroes_url} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Wishlist ---- */}
      {tab === "wishlist" && (
        <div className="flex flex-col gap-3">
          {wishlist.length === 0 ? (
            <Empty>
              Your wishlist is empty. Add players from the Player Pool tab.
            </Empty>
          ) : (
            wishlist.map((w) => (
              <WishlistRow
                key={w.id}
                entry={w}
                pending={pending}
                onSave={(amt, remarks) =>
                  act(() => updateWishlist(w.player_id, amt, remarks))
                }
                onRemove={() => act(() => removeFromWishlist(w.player_id))}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Squad ---- */}
      {tab === "squad" && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Updates live as you win players in the auction
          </p>
          {squad.length === 0 ? (
            <Empty>No players bought yet. Your wins will appear here live.</Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-card text-left">
                    {["Player", "Category", "Price", "Type"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {squad.map((s) => (
                    <tr key={s.player_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.player?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={s.player?.assigned_category ?? null} />
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        ₹{inr(s.sold_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                        {s.acquisition_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <Icon className="size-5 shrink-0 text-accent" />
      <div className="flex flex-col">
        <span className="font-heading text-xl font-bold text-foreground">{value}</span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground/80">{sub}</span>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function WishlistRow({
  entry,
  pending,
  onSave,
  onRemove,
}: {
  entry: WishlistEntry;
  pending: boolean;
  onSave: (amount: string, remarks: string) => void;
  onRemove: () => void;
}) {
  const [amount, setAmount] = useState(
    entry.target_amount != null ? String(entry.target_amount) : "",
  );
  const [remarks, setRemarks] = useState(entry.remarks ?? "");
  const dirty =
    amount !== (entry.target_amount != null ? String(entry.target_amount) : "") ||
    remarks !== (entry.remarks ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {entry.player?.full_name ?? "Player"}
            </span>
            <CategoryBadge category={entry.player?.assigned_category ?? null} />
          </div>
          {entry.player && <StatLine p={entry.player} />}
          <CricLink url={entry.player?.cricheroes_url ?? null} />
        </div>
        <button
          disabled={pending}
          onClick={onRemove}
          title="Remove from wishlist"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)] disabled:opacity-60"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Target Amount (₹)
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Max you'd bid"
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Remarks
          </span>
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Private notes…"
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          disabled={pending || !dirty}
          onClick={() => onSave(amount, remarks)}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  );
}
