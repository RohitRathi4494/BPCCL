"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { computeCategory } from "@/lib/categorization";
import { STAT_FIELDS, type StatKey } from "@/lib/registration";
import { getSiteUrl } from "@/lib/site";
import { sendEmail } from "@/lib/email/send";
import {
  approvalEmail,
  rejectionEmail,
  aadhaarReminderEmail,
} from "@/lib/email/templates";

export type ReviewState = { error?: string };
export type EditStatsState = { error?: string; saved?: boolean };
export type EditAgeState = { error?: string; saved?: boolean; age?: number };
export type ResetState = { error?: string };
export type DeleteState = { error?: string };
export type BulkState = { error?: string; approved?: number };
export type AutoAssignState = { error?: string; assigned?: number };
export type ReminderState = {
  error?: string;
  sent?: number;
  skipped?: number;
  failed?: number;
  /** Selected players that couldn't be emailed (already uploaded / rejected / no email). */
  ineligible?: number;
};

type DbClient = Awaited<ReturnType<typeof createClient>>;

type ReminderTarget = {
  id: string;
  full_name: string;
  email: string | null;
  registration_code: string | null;
};

/**
 * Shared Aadhaar-reminder sender. Emails each target the self-service link in
 * small concurrent batches (best-effort per email), then stamps
 * `aadhaar_reminded_at` on the ones that actually went out so re-runs behave.
 * Callers are responsible for deciding *who* the targets are.
 */
async function sendAadhaarReminders(
  supabase: DbClient,
  targets: ReminderTarget[],
): Promise<{ sent: number; skipped: number; failed: number }> {
  const url = `${getSiteUrl()}/register/aadhaar`;
  const sentIds: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const BATCH = 8;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const mail = aadhaarReminderEmail(
            p.full_name,
            p.registration_code,
            url,
          );
          const r = await sendEmail({
            to: p.email!,
            subject: mail.subject,
            html: mail.html,
          });
          return {
            id: p.id,
            outcome: r.skipped ? "skipped" : r.ok ? "sent" : "failed",
          };
        } catch (e) {
          console.error("aadhaar reminder email:", e);
          return { id: p.id, outcome: "failed" as const };
        }
      }),
    );
    for (const { id, outcome } of results) {
      if (outcome === "sent") {
        sent++;
        sentIds.push(id);
      } else if (outcome === "skipped") skipped++;
      else failed++;
    }
  }

  // Stamp only the players we actually emailed, so a re-run skips them but still
  // picks up anyone that was skipped (e.g. SMTP not configured) or failed.
  if (sentIds.length > 0) {
    const { error: stampErr } = await supabase
      .from("players")
      .update({ aadhaar_reminded_at: new Date().toISOString() })
      .in("id", sentIds);
    if (stampErr) console.error("aadhaar reminder stamp:", stampErr.message);
  }

  return { sent, skipped, failed };
}

// Columns the auto-categoriser needs.
const STAT_COLS =
  "matches_played, runs_scored, batting_average, batting_strike_rate, wickets_taken, economy";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Approve several registrations at once from the list. Keeps each player's
 * existing category (a category can still be assigned individually later), marks
 * them approved, and emails only those that weren't already approved.
 */
export async function bulkApprovePlayers(
  _prev: BulkState,
  formData: FormData,
): Promise<BulkState> {
  const ids = [
    ...new Set(
      formData
        .getAll("player_ids")
        .map((v) => String(v))
        .filter((v) => UUID_RE.test(v)),
    ),
  ];
  if (ids.length === 0) return { error: "Select at least one registration." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  // Fetch to decide who is newly approved (for emails) vs already approved,
  // and to auto-assign a category to anyone who doesn't have one yet.
  const { data: players, error: fetchErr } = await supabase
    .from("players")
    .select(`id, full_name, email, assigned_category, status, ${STAT_COLS}`)
    .in("id", ids);
  if (fetchErr) {
    console.error("bulkApprovePlayers fetch:", fetchErr.message);
    return { error: "Could not load the selected players. Please try again." };
  }

  const newlyApproved = (players ?? []).filter((p) => p.status !== "approved");

  const { error } = await supabase
    .from("players")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .in("id", ids);
  if (error) {
    console.error("bulkApprovePlayers update:", error.message);
    return { error: "Could not approve the selected players. Please try again." };
  }

  // Auto-assign categories to approved players that don't have one — grouped by
  // computed category so it's a handful of updates, not one per player. Existing
  // (admin-set) categories are left untouched.
  const missing = (players ?? []).filter(
    (p) => !p.assigned_category || String(p.assigned_category).trim() === "",
  );
  const byCategory = new Map<string, string[]>();
  for (const p of missing) {
    const cat = computeCategory(p);
    const list = byCategory.get(cat) ?? [];
    list.push(p.id);
    byCategory.set(cat, list);
  }
  for (const [cat, catIds] of byCategory) {
    const { error: catErr } = await supabase
      .from("players")
      .update({ assigned_category: cat })
      .in("id", catIds);
    if (catErr) console.error("bulkApprove auto-category:", catErr.message);
  }
  // Re-read categories so approval emails carry the freshly assigned one.
  for (const p of newlyApproved) {
    if (!p.assigned_category || String(p.assigned_category).trim() === "") {
      p.assigned_category = computeCategory(p);
    }
  }

  // Notify the newly approved — best effort, never block on email failures.
  // Send in small concurrent batches (not one-at-a-time) so approving a large
  // selection isn't gated on each SMTP round-trip in series.
  const toEmail = newlyApproved.filter((p) => p.email);
  const BATCH = 8;
  for (let i = 0; i < toEmail.length; i += BATCH) {
    await Promise.all(
      toEmail.slice(i, i + BATCH).map(async (p) => {
        try {
          const mail = approvalEmail(p.full_name, p.assigned_category);
          await sendEmail({ to: p.email!, subject: mail.subject, html: mail.html });
        } catch (e) {
          console.error("bulk approval email:", e);
        }
      }),
    );
  }

  revalidatePath("/admin/registrations");
  // Category/approval changes can affect what the squad pages display.
  revalidatePath("/admin/squads");
  revalidatePath("/franchises");
  return { approved: newlyApproved.length };
}

/**
 * Permanently delete a player registration. Admin-only via RLS
 * ("players admin delete"). Cascades to any bids/squad rows and nulls the
 * player out of auction/match references (per the schema's FK rules).
 */
export async function deletePlayer(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const playerId = String(formData.get("player_id") ?? "");
  // Defence-in-depth: only ever delete by a single, well-formed UUID. This makes
  // it impossible for a blank/garbled value to widen the delete.
  if (!UUID_RE.test(playerId)) return { error: "Missing or invalid player." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { data: deleted, error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .select("id");
  if (error) {
    console.error("deletePlayer:", error.message);
    return { error: "Could not delete this registration. Please try again." };
  }
  // A PK match can only ever hit one row; log if that assumption is violated.
  if ((deleted?.length ?? 0) !== 1) {
    console.warn(`deletePlayer: expected 1 row, deleted ${deleted?.length ?? 0}`);
  }

  revalidatePath("/admin/registrations");
  // From the review page there's nowhere to stay (the player is gone) — send
  // the admin back to the list. The list uses no redirect and just refreshes.
  const redirectTo = String(formData.get("redirect_to") ?? "");
  if (redirectTo.startsWith("/admin/")) redirect(redirectTo);
  return {};
}

/**
 * Undo a review decision: move an approved/rejected player back to "pending"
 * (neither approved nor rejected). Clears the rejection reason and the reviewed
 * stamp; keeps any assigned category. For fixing a mistaken approve/reject.
 */
export async function resetToPending(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const playerId = String(formData.get("player_id") ?? "");
  if (!UUID_RE.test(playerId)) return { error: "Missing or invalid player." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { error } = await supabase
    .from("players")
    .update({
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", playerId);

  if (error) {
    console.error("resetToPending:", error.message);
    return { error: "Could not reset this registration. Please try again." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${playerId}`);
  return {};
}

export async function reviewPlayer(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const playerId = String(formData.get("player_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  let category = String(formData.get("assigned_category") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!playerId) return { error: "Missing player." };
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Invalid action." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Approving needs a category. If the admin didn't pick one, auto-assign it
  // from the player's stats (the admin can still change it afterwards).
  if (decision === "approve") {
    if (!category) {
      const { data: sp } = await supabase
        .from("players")
        .select(STAT_COLS)
        .eq("id", playerId)
        .maybeSingle();
      if (sp) category = computeCategory(sp);
    }
    const settings = await getLeagueSettings();
    const categories = settingsCategories(settings);
    if (categories.length && category && !categories.includes(category)) {
      return { error: "Pick a valid category." };
    }
    if (!category) return { error: "Assign a category before approving." };
  }

  // Rejecting requires a reason (it's emailed to the player).
  if (decision === "reject" && !rejectionReason) {
    return { error: "Enter a reason for rejection (the player is emailed this)." };
  }

  const { error } = await supabase
    .from("players")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      // On reject, keep any previously assigned category as-is unless provided.
      assigned_category: decision === "approve" ? category : category || null,
      rejection_reason: decision === "reject" ? rejectionReason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    })
    .eq("id", playerId);

  if (error) {
    console.error("reviewPlayer:", error.message);
    return { error: "Could not save the review. Please try again." };
  }

  // Notify the player — never let an email failure block the review.
  try {
    const { data: player } = await supabase
      .from("players")
      .select("full_name, email")
      .eq("id", playerId)
      .maybeSingle();

    if (player?.email) {
      const mail =
        decision === "approve"
          ? approvalEmail(player.full_name, category || null)
          : rejectionEmail(player.full_name, rejectionReason);
      await sendEmail({ to: player.email, subject: mail.subject, html: mail.html });
    }
  } catch (e) {
    console.error("review email:", e);
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${playerId}`);
  // A category change here must flow through to the squad displays.
  revalidatePath("/admin/squads");
  revalidatePath("/franchises");
  redirect(`/admin/registrations?reviewed=1`);
}

/**
 * Correct a single player's self-reported career stats. Many registrants entered
 * "NA" (or wrong values), so the admin can overwrite the stat columns from the
 * review page. Only the known stat columns are writable here (whitelist), and an
 * empty box is stored as NULL. Admin-only via RLS ("players admin update").
 *
 * Note: the stats-based category suggestion recomputes on the next load, so
 * saving corrected stats also refreshes the "Suggested from stats" hint.
 */
export async function editPlayerStats(
  _prev: EditStatsState,
  formData: FormData,
): Promise<EditStatsState> {
  const playerId = String(formData.get("player_id") ?? "");
  if (!UUID_RE.test(playerId)) return { error: "Missing or invalid player." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  // Whitelist: only the recognised stat columns can be written from this form.
  const updates: Partial<Record<StatKey, string | null>> = {};
  for (const { key } of STAT_FIELDS) {
    if (!formData.has(key)) continue;
    const v = String(formData.get(key) ?? "").trim();
    updates[key] = v === "" ? null : v;
  }
  if (Object.keys(updates).length === 0) return { error: "No stats to save." };

  const { error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", playerId);
  if (error) {
    console.error("editPlayerStats:", error.message);
    return { error: "Could not save the stats. Please try again." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${playerId}`);
  return { saved: true };
}

/**
 * Override a single player's age. The date of birth is intentionally left
 * untouched — some registrants entered a placeholder/incorrect DOB, so the admin
 * can correct the age that drives the age buckets (30–below 35 / 35 & above)
 * without rewriting their DOB. `players.age` is a non-null int, so a valid whole
 * number is required. Admin-only via RLS ("players admin update").
 */
export async function editPlayerAge(
  _prev: EditAgeState,
  formData: FormData,
): Promise<EditAgeState> {
  const playerId = String(formData.get("player_id") ?? "");
  if (!UUID_RE.test(playerId)) return { error: "Missing or invalid player." };

  const raw = String(formData.get("age") ?? "").trim();
  if (!raw) return { error: "Enter an age." };
  if (!/^\d{1,3}$/.test(raw)) return { error: "Age must be a whole number." };
  const age = Number(raw);
  if (age < 1 || age > 120) return { error: "Enter an age between 1 and 120." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { error } = await supabase
    .from("players")
    .update({ age })
    .eq("id", playerId);
  if (error) {
    console.error("editPlayerAge:", error.message);
    return { error: "Could not save the age. Please try again." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${playerId}`);
  return { saved: true, age };
}

/**
 * Auto-assign a category to every player that doesn't already have one, using
 * the stats-based rules in `lib/categorization.ts`. Players whose category was
 * set manually are left untouched. Grouped by computed category → a handful of
 * updates rather than one per player.
 */
export async function autoAssignCategories(): Promise<AutoAssignState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { data: players, error } = await supabase
    .from("players")
    .select(`id, assigned_category, ${STAT_COLS}`);
  if (error) {
    console.error("autoAssignCategories fetch:", error.message);
    return { error: "Could not load players. Please try again." };
  }

  const targets = (players ?? []).filter(
    (p) => !p.assigned_category || String(p.assigned_category).trim() === "",
  );

  const byCategory = new Map<string, string[]>();
  for (const p of targets) {
    const cat = computeCategory(p);
    const list = byCategory.get(cat) ?? [];
    list.push(p.id);
    byCategory.set(cat, list);
  }

  let assigned = 0;
  for (const [cat, ids] of byCategory) {
    const { error: uErr } = await supabase
      .from("players")
      .update({ assigned_category: cat })
      .in("id", ids);
    if (uErr) {
      console.error("autoAssignCategories update:", uErr.message);
      return { error: "Could not save some categories. Please try again." };
    }
    assigned += ids.length;
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/squads");
  revalidatePath("/franchises");
  return { assigned };
}

/**
 * Email every non-rejected player who hasn't uploaded an Aadhaar yet, with their
 * registration ID and the self-service link. Best-effort per email; sent in
 * small concurrent batches. Re-runnable (will re-email anyone still missing it).
 */
export async function emailAadhaarReminders(): Promise<ReminderState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  // Only players who still have no Aadhaar AND haven't been reminded yet.
  const { data: players, error } = await supabase
    .from("players")
    .select("id, full_name, email, registration_code")
    .is("aadhaar_path", null)
    .is("aadhaar_reminded_at", null)
    .neq("status", "rejected")
    .not("email", "is", null);
  if (error) {
    console.error("emailAadhaarReminders fetch:", error.message);
    return { error: "Could not load players. Please try again." };
  }

  const targets = (players ?? []).filter((p) => p.email);
  if (targets.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  const { sent, skipped, failed } = await sendAadhaarReminders(supabase, targets);

  revalidatePath("/admin/registrations");
  return { sent, skipped, failed };
}

/**
 * Email Aadhaar reminders to a *specific selection* of players (chosen via the
 * checkboxes on the registrations list). Unlike the bulk-all sender, this
 * re-sends even to players already reminded — the admin picked them on purpose.
 * Players in the selection who already uploaded an Aadhaar, are rejected, or
 * have no email on file are counted as `ineligible` and silently skipped.
 */
export async function emailAadhaarRemindersToSelected(
  _prev: ReminderState,
  formData: FormData,
): Promise<ReminderState> {
  const ids = [
    ...new Set(
      formData
        .getAll("player_ids")
        .map((v) => String(v))
        .filter((v) => UUID_RE.test(v)),
    ),
  ];
  if (ids.length === 0) return { error: "Select at least one registration." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  // Of the selected ids, keep only those still eligible for an Aadhaar reminder.
  const { data: players, error } = await supabase
    .from("players")
    .select("id, full_name, email, registration_code")
    .in("id", ids)
    .is("aadhaar_path", null)
    .neq("status", "rejected")
    .not("email", "is", null);
  if (error) {
    console.error("emailAadhaarRemindersToSelected fetch:", error.message);
    return { error: "Could not load the selected players. Please try again." };
  }

  const targets = (players ?? []).filter((p) => p.email);
  const ineligible = ids.length - targets.length;
  if (targets.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, ineligible };
  }

  const { sent, skipped, failed } = await sendAadhaarReminders(supabase, targets);

  revalidatePath("/admin/registrations");
  return { sent, skipped, failed, ineligible };
}
