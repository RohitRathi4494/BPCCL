"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MATCH_STATUSES } from "@/lib/fixtures";

export type FixtureState = { error?: string; ok?: boolean };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

async function ensureAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Your session expired — please sign in again.";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return "Admins only.";
  return null;
}

/** Parse the shared fixture fields from a form. Returns a row or an error. */
function parseFixture(formData: FormData):
  | { error: string }
  | {
      row: {
        match_number: number | null;
        stage: string;
        pool: string | null;
        franchise_a_id: string;
        franchise_b_id: string;
        scheduled_at: string;
        ground: string | null;
        status: string;
      };
    } {
  const a = String(formData.get("franchise_a_id") ?? "");
  const b = String(formData.get("franchise_b_id") ?? "");
  if (!UUID_RE.test(a) || !UUID_RE.test(b))
    return { error: "Pick both teams." };
  if (a === b) return { error: "A team can't play itself." };

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (!DATE_RE.test(date) || !TIME_RE.test(time))
    return { error: "Enter a valid date and time." };
  // Store as an unambiguous IST instant.
  const scheduled_at = `${date}T${time}:00+05:30`;

  const poolRaw = String(formData.get("pool") ?? "").trim();
  const pool = poolRaw === "A" || poolRaw === "B" ? poolRaw : null;

  const stage = String(formData.get("stage") ?? "").trim() || "League";

  const status = String(formData.get("status") ?? "scheduled").trim();
  if (!MATCH_STATUSES.includes(status as (typeof MATCH_STATUSES)[number]))
    return { error: "Invalid status." };

  const mnRaw = String(formData.get("match_number") ?? "").trim();
  const match_number = mnRaw ? Number(mnRaw) : null;
  if (mnRaw && (!Number.isInteger(match_number) || match_number! < 0))
    return { error: "Match number must be a whole number." };

  const ground =
    String(formData.get("ground") ?? "").trim() ||
    "Champions Den, Bandhwari";

  return {
    row: {
      match_number,
      stage,
      pool,
      franchise_a_id: a,
      franchise_b_id: b,
      scheduled_at,
      ground,
      status,
    },
  };
}

/** Create a fixture. */
export async function createMatch(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const parsed = parseFixture(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("matches").insert(parsed.row);
  if (error) {
    console.error("createMatch:", error.message);
    return { error: "Could not save the fixture. Please try again." };
  }
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  return { ok: true };
}

/** Update a fixture's core details (not the result). */
export async function updateMatch(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("match_id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid fixture." };

  const parsed = parseFixture(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update(parsed.row)
    .eq("id", id);
  if (error) {
    console.error("updateMatch:", error.message);
    return { error: "Could not save the fixture. Please try again." };
  }
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  return { ok: true };
}

/**
 * Record (or clear) a result.
 *   outcome = "A" | "B"   → that team won; needs margin + type.
 *   outcome = "tie"       → completed, no winner.
 *   outcome = "abandoned" → abandoned / no result.
 *   outcome = "clear"     → back to scheduled, wipe result fields.
 */
export async function setResult(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("match_id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid fixture." };

  const outcome = String(formData.get("outcome") ?? "");
  const note = String(formData.get("result_note") ?? "").trim() || null;

  const update: {
    status: string;
    winner_id: string | null;
    result_margin: number | null;
    result_type: string | null;
    result_note: string | null;
  } = {
    status: "completed",
    winner_id: null,
    result_margin: null,
    result_type: null,
    result_note: note,
  };

  if (outcome === "clear") {
    update.status = "scheduled";
    update.result_note = null;
  } else if (outcome === "abandoned") {
    update.status = "abandoned";
  } else if (outcome === "tie") {
    // completed, no winner
  } else if (outcome === "A" || outcome === "B") {
    const winner = String(
      formData.get(outcome === "A" ? "franchise_a_id" : "franchise_b_id") ?? "",
    );
    if (!UUID_RE.test(winner)) return { error: "Invalid winning team." };
    const marginRaw = String(formData.get("result_margin") ?? "").trim();
    const type = String(formData.get("result_type") ?? "");
    const margin = Number(marginRaw);
    if (!marginRaw || !Number.isInteger(margin) || margin <= 0)
      return { error: "Enter the winning margin." };
    if (type !== "runs" && type !== "wickets")
      return { error: "Pick runs or wickets." };
    update.winner_id = winner;
    update.result_margin = margin;
    update.result_type = type;
  } else {
    return { error: "Pick an outcome." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("matches").update(update).eq("id", id);
  if (error) {
    console.error("setResult:", error.message);
    return { error: "Could not save the result. Please try again." };
  }
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  return { ok: true };
}

/** Assign a franchise to a group (pool). value: 'A' | 'B' | '' (unassign). */
export async function setFranchiseGroup(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("franchise_id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid team." };
  const raw = String(formData.get("pool") ?? "").trim();
  const pool = raw === "A" || raw === "B" ? raw : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("franchises")
    .update({ pool })
    .eq("id", id);
  if (error) {
    console.error("setFranchiseGroup:", error.message);
    return { error: "Could not save the group. Please try again." };
  }
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  return { ok: true };
}

/** Delete a fixture. */
export async function deleteMatch(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("match_id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid fixture." };

  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) {
    console.error("deleteMatch:", error.message);
    return { error: "Could not delete the fixture. Please try again." };
  }
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  return { ok: true };
}
