"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FranchiseState = { error?: string; ok?: boolean };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verify the caller is a signed-in admin (returns null if OK, else an error). */
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

/** Rename a franchise / set its short code (admin, RLS-enforced). */
export async function updateFranchise(
  _prev: FranchiseState,
  formData: FormData,
): Promise<FranchiseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  const id = String(formData.get("franchise_id") ?? "");
  if (!UUID_RE.test(id)) return { error: "Invalid franchise." };
  const name = String(formData.get("name") ?? "").trim();
  const short_code = String(formData.get("short_code") ?? "").trim() || null;
  if (!name) return { error: "Franchise name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("franchises")
    .update({ name, short_code })
    .eq("id", id);
  if (error) {
    console.error("updateFranchise:", error.message);
    return { error: "Could not save the franchise. Please try again." };
  }
  revalidatePath("/admin/franchises");
  return { ok: true };
}

/**
 * Create (or update) the login for a franchise owner and link it to the
 * franchise. Uses the service-role admin client, so SUPABASE_SERVICE_ROLE_KEY
 * must be set. Re-using an existing email resets its password + re-links it.
 */
export async function setFranchiseOwnerLogin(
  _prev: FranchiseState,
  formData: FormData,
): Promise<FranchiseState> {
  const authErr = await ensureAdmin();
  if (authErr) return { error: authErr };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "Set SUPABASE_SERVICE_ROLE_KEY in the environment to create owner logins.",
    };
  }

  const franchiseId = String(formData.get("franchise_id") ?? "");
  if (!UUID_RE.test(franchiseId)) return { error: "Invalid franchise." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();

  // Create the auth user, or find + re-password an existing one.
  let userId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    if (/registered|already|exists/i.test(createErr.message)) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = list?.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!found) return { error: "That email exists but couldn't be found." };
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password });
    } else {
      console.error("createUser:", createErr.message);
      return { error: "Could not create the login. Please try again." };
    }
  } else {
    userId = created?.user?.id;
  }
  if (!userId) return { error: "Could not resolve the user account." };

  // Link the profile to the franchise as its owner.
  const { error: profErr } = await admin.from("profiles").upsert({
    id: userId,
    role: "franchise_owner",
    franchise_id: franchiseId,
  });
  if (profErr) {
    console.error("link profile:", profErr.message);
    return { error: "Login created but linking failed. Please try again." };
  }

  revalidatePath("/admin/franchises");
  return { ok: true };
}
