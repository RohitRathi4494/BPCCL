"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LoginState = { error?: string };
export type WishlistState = { error?: string; ok?: boolean };

/** Sign in a franchise owner and send them to their dashboard. */
export async function franchiseLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, franchise_id")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || profile.role !== "franchise_owner" || !profile.franchise_id) {
    await supabase.auth.signOut();
    return { error: "This account isn't linked to a franchise." };
  }

  redirect("/franchise");
}

export async function franchiseSignOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/franchise/login");
}

/** Resolve the signed-in owner's franchise_id, or null if not an owner. */
async function currentFranchiseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, franchise_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "franchise_owner") return null;
  return profile.franchise_id ?? null;
}

/** Add a player to the calling franchise's wishlist (no-op if already there). */
export async function addToWishlist(playerId: string): Promise<WishlistState> {
  if (!UUID_RE.test(playerId)) return { error: "Invalid player." };
  const supabase = await createClient();
  const franchiseId = await currentFranchiseId(supabase);
  if (!franchiseId) return { error: "Your session expired — please sign in again." };

  const { error } = await supabase
    .from("wishlists")
    .upsert(
      { franchise_id: franchiseId, player_id: playerId },
      { onConflict: "franchise_id,player_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("addToWishlist:", error.message);
    return { error: "Could not add to wishlist. Please try again." };
  }
  revalidatePath("/franchise");
  return { ok: true };
}

/** Update the target amount + remarks for a wishlisted player. */
export async function updateWishlist(
  playerId: string,
  targetAmountRaw: string,
  remarksRaw: string,
): Promise<WishlistState> {
  if (!UUID_RE.test(playerId)) return { error: "Invalid player." };
  const supabase = await createClient();
  const franchiseId = await currentFranchiseId(supabase);
  if (!franchiseId) return { error: "Your session expired — please sign in again." };

  let target_amount: number | null = null;
  const trimmed = targetAmountRaw.trim();
  if (trimmed) {
    const n = Number(trimmed.replace(/[,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { error: "Enter a whole, non-negative amount (or leave it blank)." };
    }
    target_amount = n;
  }
  const remarks = remarksRaw.trim().slice(0, 500) || null;

  const { error } = await supabase
    .from("wishlists")
    .update({ target_amount, remarks, updated_at: new Date().toISOString() })
    .eq("franchise_id", franchiseId)
    .eq("player_id", playerId);
  if (error) {
    console.error("updateWishlist:", error.message);
    return { error: "Could not save. Please try again." };
  }
  revalidatePath("/franchise");
  return { ok: true };
}

/** Remove a player from the calling franchise's wishlist. */
export async function removeFromWishlist(
  playerId: string,
): Promise<WishlistState> {
  if (!UUID_RE.test(playerId)) return { error: "Invalid player." };
  const supabase = await createClient();
  const franchiseId = await currentFranchiseId(supabase);
  if (!franchiseId) return { error: "Your session expired — please sign in again." };

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("franchise_id", franchiseId)
    .eq("player_id", playerId);
  if (error) {
    console.error("removeFromWishlist:", error.message);
    return { error: "Could not remove. Please try again." };
  }
  revalidatePath("/franchise");
  return { ok: true };
}
