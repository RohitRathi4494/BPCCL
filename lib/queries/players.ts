import { createClient } from "@/lib/supabase/server";
import { AGE_BUCKETS, ROLE_GROUPS, STAT_FIELDS } from "@/lib/registration";
import type { Player } from "@/lib/types";

// Column names of the self-reported career stats.
const STAT_KEYS = STAT_FIELDS.map((f) => f.key);
// ilike pattern that matches "NA", "N/A", "na", "N.A" etc. but not a number.
// In an .or() string supabase uses `*` as the wildcard; in .not() it uses `%`.
const NA_STAR = "N*A";
const NA_PCT = "N%A";

export type RegistrationStatus = "all" | "pending" | "approved" | "rejected";

/** Result ordering. Default (newest) sorts by submission date, descending. */
export type RegistrationSort = "newest" | "age_asc" | "age_desc";

export type RegistrationQuery = {
  page?: number;
  q?: string;
  status?: RegistrationStatus;
  category?: string;
  role?: string; // a ROLE_GROUPS label (Batting / Bowling / All Rounder / Wicket Keeper)
  stats?: string; // "na" = has NA/blank in any stat, "complete" = all filled
  aadhaar?: string; // "verified" | "unverified" (admin identity check)
  payment?: string; // "verified" | "unverified" (admin payment check)
  age?: string; // an AGE_BUCKETS key ("u35" = 30–<35, "o35" = 35+)
  sort?: string; // a RegistrationSort ("newest" | "age_asc" | "age_desc")
  pageSize?: number;
};

export type RegistrationsResult = {
  rows: Player[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Admin-only (RLS): paginated, searchable, status-filtered registrations. */
export async function getRegistrations(
  query: RegistrationQuery,
): Promise<RegistrationsResult> {
  const supabase = await createClient();
  const pageSize = query.pageSize ?? 25;
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("players")
    .select("*", { count: "exact" })
    .range(from, to);

  // Ordering: age (ascending/descending) with a stable submission-date tiebreak,
  // otherwise newest-first by submission date. Nulls sort last either way.
  if (query.sort === "age_asc" || query.sort === "age_desc") {
    q = q
      .order("age", { ascending: query.sort === "age_asc", nullsFirst: false })
      .order("submitted_at", { ascending: false });
  } else {
    q = q.order("submitted_at", { ascending: false });
  }

  if (query.status && query.status !== "all") {
    q = q.eq("status", query.status);
  }

  if (query.category) {
    q = q.eq("assigned_category", query.category);
  }

  if (query.role) {
    // Match players whose roles array overlaps any role in the chosen group.
    const group = ROLE_GROUPS.find((g) => g.label === query.role);
    if (group) q = q.overlaps("roles", group.roles as unknown as string[]);
  }

  if (query.stats === "na") {
    // Any stat column that is NA-ish (or null on legacy rows).
    const conds = STAT_KEYS.flatMap((c) => [
      `${c}.ilike.${NA_STAR}`,
      `${c}.is.null`,
    ]).join(",");
    q = q.or(conds);
  } else if (query.stats === "complete") {
    // Every stat column present and not NA-ish.
    for (const c of STAT_KEYS) {
      q = q.not(c, "is", null).not(c, "ilike", NA_PCT);
    }
  }

  if (query.aadhaar === "unverified") {
    q = q.eq("aadhaar_verified", false);
  } else if (query.aadhaar === "verified") {
    q = q.eq("aadhaar_verified", true);
  }

  if (query.payment === "unverified") {
    q = q.eq("payment_verified", false);
  } else if (query.payment === "verified") {
    q = q.eq("payment_verified", true);
  }

  if (query.age) {
    const bucket = AGE_BUCKETS.find((b) => b.key === query.age);
    if (bucket) {
      q = q.gte("age", bucket.min);
      if (bucket.max != null) q = q.lt("age", bucket.max);
    }
  }

  if (query.q) {
    // Strip characters that would break PostgREST's or() filter grammar.
    const safe = query.q.replace(/[(),*%:]/g, "").trim();
    if (safe) {
      q = q.or(`full_name.ilike.*${safe}*,phone.ilike.*${safe}*,email.ilike.*${safe}*`);
    }
  }

  const { data, count, error } = await q;
  if (error) {
    console.error("getRegistrations:", error.message);
    return { rows: [], total: 0, page, pageSize, pageCount: 0 };
  }

  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type RegistrationCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

/** Counts per status for the dashboard header. */
export async function getRegistrationCounts(): Promise<RegistrationCounts> {
  const supabase = await createClient();
  const statuses = ["pending", "approved", "rejected"] as const;

  const results = await Promise.all(
    statuses.map((s) =>
      supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("status", s),
    ),
  );

  const [pending, approved, rejected] = results.map((r) => r.count ?? 0);
  return {
    pending,
    approved,
    rejected,
    all: pending + approved + rejected,
  };
}

/** A single registration for the review detail page. */
export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getPlayer:", error.message);
    return null;
  }
  return data;
}
