import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";

export type RegistrationStatus = "all" | "pending" | "approved" | "rejected";

export type RegistrationQuery = {
  page?: number;
  q?: string;
  status?: RegistrationStatus;
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
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (query.status && query.status !== "all") {
    q = q.eq("status", query.status);
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
