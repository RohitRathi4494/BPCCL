"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { sendEmail } from "@/lib/email/send";
import { approvalEmail, rejectionEmail } from "@/lib/email/templates";

export type ReviewState = { error?: string };
export type DeleteState = { error?: string };

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
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

export async function reviewPlayer(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const playerId = String(formData.get("player_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const category = String(formData.get("assigned_category") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!playerId) return { error: "Missing player." };
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Invalid action." };
  }

  // Approving requires a category assignment.
  if (decision === "approve") {
    if (!category) return { error: "Assign a category before approving." };
    const settings = await getLeagueSettings();
    const categories = settingsCategories(settings);
    if (categories.length && !categories.includes(category)) {
      return { error: "Pick a valid category." };
    }
  }

  // Rejecting requires a reason (it's emailed to the player).
  if (decision === "reject" && !rejectionReason) {
    return { error: "Enter a reason for rejection (the player is emailed this)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  redirect(`/admin/registrations?reviewed=1`);
}
