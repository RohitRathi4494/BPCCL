"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deletePrivateObject } from "@/lib/storage";

export type PurgePaymentState = { error?: string; deleted?: number };

async function ensureAdmin(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired — please sign in again." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Admins only." };
  return { ok: true };
}

/**
 * Bulk-delete the stored payment screenshots for players whose payment is
 * VERIFIED. Deletes the private R2 object and clears `payment_screenshot_key`;
 * the UTR + verified flags are kept. Meant to be run once registration closes.
 */
export async function deleteVerifiedPaymentScreenshots(
  _prev: PurgePaymentState,
  _formData: FormData,
): Promise<PurgePaymentState> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { error: admin.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, payment_screenshot_key")
    .eq("payment_verified", true)
    .not("payment_screenshot_key", "is", null);
  if (error) {
    console.error("deleteVerifiedPaymentScreenshots fetch:", error.message);
    return { error: "Could not load payment screenshots. Please try again." };
  }

  let deleted = 0;
  for (const p of data ?? []) {
    const key = p.payment_screenshot_key as string | null;
    if (!key) continue;
    try {
      await deletePrivateObject(key);
    } catch (e) {
      console.error("delete payment object:", e);
      continue; // leave the key so a retry can clean it up
    }
    const { error: uErr } = await supabase
      .from("players")
      .update({ payment_screenshot_key: null })
      .eq("id", p.id);
    if (uErr) {
      console.error("clear payment key:", uErr.message);
      continue;
    }
    deleted++;
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/exports");
  return { deleted };
}
