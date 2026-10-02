"use client";

import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  Heart,
  Search,
  Trash2,
  Check,
  User,
  Users,
  Wallet,
} from "lucide-react";
import {
  addToWishlist,
  removeFromWishlist,
  updateWishlist,
} from "@/app/franchise/actions";
import { createClient } from "@/lib/supabase/client";
import { AGE_BUCKETS, ROLE_GROUPS, ageBucketOf } from "@/lib/registration";
import { cn } from "@/lib/utils";
import type { PoolPlayer } from "@/lib/types";
import type { WishlistEntry, SquadEntry } from "@/lib/queries/franchise";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

// Preferred display order for category filter options.
const CATEGORY_ORDER = ["Legend", "Category A+", "Category A", "Category B"];

// Normalise a player's category to a stable bucket key (null/blank → the
// "Uncategorised" bucket) so counts and filters line up.
const catKey = (c: string | null | undefined) =>
  c && c.trim() ? c : "Uncategorised";

type Franchise = {
  id: string;
  name: string;
  purse_total: number;
  purse_remaining: number;
};

type Tab = "pool" | "wishlist" | "squad";

type WishlistAction =
  | { type: "add"; entry: WishlistEntry }
  | { type: "remove"; playerId: string }
  | { type: "save"; playerId: string; target: number | null; remarks: string | null };

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

/** Player photo (uploaded at registration), or a fallback silhouette. */
function PlayerAvatar({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-9" : "size-14";
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-border bg-background",
        dim,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "Player"}
          fill
          sizes={size === "sm" ? "36px" : "56px"}
          className="object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center">
          <User
            className={cn(
              size === "sm" ? "size-4" : "size-6",
              "text-muted-foreground/40",
            )}
          />
        </span>
      )}
    </div>
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

/** Player age chip, shown while shortlisting. */
function AgeBadge({ age }: { age: number | null }) {
  if (age == null) return null;
  return (
    <span className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
      {age} yrs
    </span>
  );
}

/** Count players per assigned category, in the preferred order (+ extras). */
function tallyByCategory(categories: (string | null | undefined)[]): {
  items: { category: string; count: number }[];
  total: number;
} {
  const map = new Map<string, number>();
  for (const c of categories) {
    const key = catKey(c);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const ordered = CATEGORY_ORDER.filter((c) => map.has(c));
  const extras = [...map.keys()]
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort();
  const items = [...ordered, ...extras].map((category) => ({
    category,
    count: map.get(category)!,
  }));
  return { items, total: categories.length };
}

/**
 * Per-category count chips that double as a filter. Clicking a category chip
 * selects it (`onSelect(category)`); clicking it again — or the "All" chip —
 * clears the filter (`onSelect("")`). Lets owners see the category spread AND
 * drill into one category from the same control.
 */
function CategoryTally({
  categories,
  active,
  onSelect,
}: {
  categories: (string | null | undefined)[];
  active: string;
  onSelect: (category: string) => void;
}) {
  const { items, total } = useMemo(
    () => tallyByCategory(categories),
    [categories],
  );
  if (total === 0) return null;

  const chip = (value: string, label: string, count: number) => {
    const isActive = active === value;
    return (
      <button
        key={value || "__all"}
        onClick={() => onSelect(isActive ? "" : value)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-colors",
          isActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-foreground/80 hover:border-primary/40",
        )}
      >
        {label}
        <span
          className={cn(
            "font-mono text-[11px]",
            isActive ? "text-primary/80" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {chip("", "All", total)}
      {items.map((it) => chip(it.category, it.category, it.count))}
    </div>
  );
}

export function FranchiseDashboard({
  franchise,
  pool,
  soldIds,
  wishlist,
  squad,
}: {
  franchise: Franchise;
  pool: PoolPlayer[];
  soldIds: string[];
  wishlist: WishlistEntry[];
  squad: SquadEntry[];
}) {
  const [tab, setTab] = useState<Tab>("pool");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState(""); // "" = all ages, else an AGE_BUCKETS key
  const [wishlistCategory, setWishlistCategory] = useState(""); // "" = all
  const [squadCategory, setSquadCategory] = useState(""); // "" = all
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Optimistic wishlist: reflect add/remove/save instantly, then reconcile with
  // the server in the background. Without this, every click waited on the server
  // action + a full router.refresh() (re-fetching the whole pool) before the
  // button changed — which felt sluggish. useOptimistic overlays the pending
  // change onto the server truth (`wishlist`) and drops it automatically once the
  // enclosing transition (action + refresh) resolves.
  const [localWishlist, applyOptimistic] = useOptimistic(
    wishlist,
    (state: WishlistEntry[], action: WishlistAction): WishlistEntry[] => {
      switch (action.type) {
        case "add":
          return state.some((w) => w.player_id === action.entry.player_id)
            ? state
            : [action.entry, ...state];
        case "remove":
          return state.filter((w) => w.player_id !== action.playerId);
        case "save":
          return state.map((w) =>
            w.player_id === action.playerId
              ? { ...w, target_amount: action.target, remarks: action.remarks }
              : w,
          );
      }
    },
  );

  const wishlistIds = useMemo(
    () => new Set(localWishlist.map((w) => w.player_id)),
    [localWishlist],
  );
  const soldSet = useMemo(() => new Set(soldIds), [soldIds]);

  // Live: refresh server data whenever ANY player is sold/locked (squad_members
  // changes), so sold players drop out of the pool and this franchise's squad
  // updates in real time.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("franchise-squad-members")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "squad_members" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Available (unsold) players — sold players drop out of the biddable pool.
  const availablePool = useMemo(
    () => pool.filter((p) => !soldSet.has(p.id ?? "")),
    [pool, soldSet],
  );

  // Pool matching every filter EXCEPT category — the category tally is computed
  // from this set so each chip's count reflects the current search/role/age.
  const poolByOtherFilters = useMemo(() => {
    const q = query.trim().toLowerCase();
    const group = roleFilter
      ? ROLE_GROUPS.find((g) => g.label === roleFilter)
      : null;
    const groupRoles = group ? new Set<string>(group.roles) : null;
    return availablePool.filter((p) => {
      if (q && !(p.full_name ?? "").toLowerCase().includes(q)) return false;
      if (ageFilter && ageBucketOf(p.age) !== ageFilter) return false;
      if (groupRoles && !(p.roles ?? []).some((r) => groupRoles.has(r)))
        return false;
      return true;
    });
  }, [availablePool, query, ageFilter, roleFilter]);

  const filteredPool = useMemo(
    () =>
      categoryFilter
        ? poolByOtherFilters.filter(
            (p) => catKey(p.assigned_category) === categoryFilter,
          )
        : poolByOtherFilters,
    [poolByOtherFilters, categoryFilter],
  );

  // Category-filtered views for the Wishlist and Squad tabs.
  const filteredWishlist = useMemo(
    () =>
      wishlistCategory
        ? localWishlist.filter(
            (w) => catKey(w.player?.assigned_category) === wishlistCategory,
          )
        : localWishlist,
    [localWishlist, wishlistCategory],
  );
  const filteredSquad = useMemo(
    () =>
      squadCategory
        ? squad.filter(
            (s) => catKey(s.player?.assigned_category) === squadCategory,
          )
        : squad,
    [squad, squadCategory],
  );

  const spent = squad.reduce((sum, s) => sum + s.sold_price, 0);

  // Instantly add a player to the wishlist (optimistic), then persist + reconcile.
  const handleAdd = (p: PoolPlayer) => {
    const id = p.id;
    if (!id || wishlistIds.has(id)) return;
    const optimistic: WishlistEntry = {
      id: `optimistic-${id}`,
      franchise_id: franchise.id,
      player_id: id,
      target_amount: null,
      remarks: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      player: p,
    };
    startTransition(async () => {
      applyOptimistic({ type: "add", entry: optimistic });
      await addToWishlist(id);
      router.refresh();
    });
  };

  // Instantly remove from the wishlist (optimistic), then persist + reconcile.
  const handleRemove = (playerId: string) => {
    startTransition(async () => {
      applyOptimistic({ type: "remove", playerId });
      await removeFromWishlist(playerId);
      router.refresh();
    });
  };

  // Optimistically apply target-amount/remarks edits, then persist + reconcile.
  // Parsing mirrors updateWishlist(); if the server rejects, the background
  // refresh reconciles the row back to the stored values.
  const handleSave = (playerId: string, amountRaw: string, remarksRaw: string) => {
    const trimmed = amountRaw.trim().replace(/[,\s]/g, "");
    const n = Number(trimmed);
    const target =
      trimmed && Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
    const remarks = remarksRaw.trim().slice(0, 500) || null;
    startTransition(async () => {
      applyOptimistic({ type: "save", playerId, target, remarks });
      await updateWishlist(playerId, amountRaw, remarksRaw);
      router.refresh();
    });
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pool", label: "Player Pool", count: availablePool.length },
    { key: "wishlist", label: "Wishlist", count: localWishlist.length },
    { key: "squad", label: "My Squad", count: squad.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={Wallet} label="Purse Remaining" value={`₹${inr(franchise.purse_remaining)}`} sub={`of ₹${inr(franchise.purse_total)}`} />
        <Tile icon={Users} label="Squad" value={String(squad.length)} sub={`₹${inr(spent)} spent`} />
        <Tile icon={Heart} label="Wishlist" value={String(localWishlist.length)} sub="players shortlisted" />
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search approved players…"
                className="w-full rounded-sm border border-input bg-background py-2.5 pr-3.5 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-sm border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All roles</option>
              {ROLE_GROUPS.map((g) => (
                <option key={g.label} value={g.label}>
                  {g.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by age category"
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="rounded-sm border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All ages</option>
              {AGE_BUCKETS.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
            <span className="font-mono text-xs text-muted-foreground">
              {filteredPool.length} shown
            </span>
            <a
              href="/franchise/pool-export"
              className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-sm border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              title="Download the full list of available players as Excel"
            >
              <Download className="size-3.5" /> Download pool (Excel)
            </a>
          </div>
          <CategoryTally
            categories={poolByOtherFilters.map((p) => p.assigned_category)}
            active={categoryFilter}
            onSelect={setCategoryFilter}
          />
          {filteredPool.length === 0 ? (
            <Empty>No approved players match these filters.</Empty>
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
                      <div className="flex items-start gap-3">
                        <PlayerAvatar src={p.photo_url} name={p.full_name} />
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">
                              {p.full_name}
                            </span>
                            <CategoryBadge category={p.assigned_category} />
                            <AgeBadge age={p.age} />
                          </div>
                          <Roles roles={p.roles} />
                        </div>
                      </div>
                      <button
                        disabled={onList || !p.id}
                        onClick={() => handleAdd(p)}
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
          {localWishlist.length === 0 ? (
            <Empty>
              Your wishlist is empty. Add players from the Player Pool tab.
            </Empty>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CategoryTally
                  categories={localWishlist.map(
                    (w) => w.player?.assigned_category,
                  )}
                  active={wishlistCategory}
                  onSelect={setWishlistCategory}
                />
                <a
                  href="/franchise/wishlist-export"
                  className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Download className="size-3.5" /> Download Excel
                </a>
              </div>
              {filteredWishlist.length === 0 ? (
                <Empty>No wishlisted players in this category.</Empty>
              ) : (
                filteredWishlist.map((w) => (
                  <WishlistRow
                    key={w.player_id}
                    entry={w}
                    onSave={(amountRaw, remarksRaw) =>
                      handleSave(w.player_id, amountRaw, remarksRaw)
                    }
                    onRemove={() => handleRemove(w.player_id)}
                  />
                ))
              )}
            </>
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
            <>
              <CategoryTally
                categories={squad.map((s) => s.player?.assigned_category)}
                active={squadCategory}
                onSelect={setSquadCategory}
              />
              {filteredSquad.length === 0 ? (
                <Empty>No squad players in this category.</Empty>
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
                  {filteredSquad.map((s) => (
                    <tr key={s.player_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar
                            src={s.player?.photo_url ?? null}
                            name={s.player?.full_name ?? null}
                            size="sm"
                          />
                          <span className="font-medium text-foreground">
                            {s.player?.full_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={s.player?.assigned_category ?? null} />
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        ₹{inr(s.sold_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                        {s.display_as_owner ? "owner" : s.acquisition_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              )}
            </>
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
  onSave,
  onRemove,
}: {
  entry: WishlistEntry;
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
        <div className="flex items-start gap-3">
          <PlayerAvatar
            src={entry.player?.photo_url ?? null}
            name={entry.player?.full_name ?? null}
          />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {entry.player?.full_name ?? "Player"}
              </span>
              <CategoryBadge category={entry.player?.assigned_category ?? null} />
              <AgeBadge age={entry.player?.age ?? null} />
            </div>
            {entry.player && <StatLine p={entry.player} />}
            <CricLink url={entry.player?.cricheroes_url ?? null} />
          </div>
        </div>
        <button
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
          disabled={!dirty}
          onClick={() => onSave(amount, remarks)}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
