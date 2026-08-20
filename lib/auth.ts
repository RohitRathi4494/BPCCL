import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Franchise } from "@/lib/types";

/** The signed-in user's profile (or null if not signed in / no profile row). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Guard for admin-only pages. Redirects to the login page if the visitor is not
 * signed in or is not an admin. Returns the admin profile otherwise.
 */
export async function requireAdmin(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/admin/login?error=forbidden");
  }
  return profile;
}

/**
 * Guard for the franchise-owner dashboard. Redirects to the franchise login if
 * the visitor isn't a franchise owner with a linked franchise. Returns the
 * profile + the resolved franchise.
 */
export async function requireFranchiseOwner(): Promise<{
  profile: Profile;
  franchise: Franchise;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/franchise/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "franchise_owner" || !profile.franchise_id) {
    redirect("/franchise/login?error=forbidden");
  }

  const { data: franchise } = await supabase
    .from("franchises")
    .select("*")
    .eq("id", profile.franchise_id)
    .maybeSingle();

  if (!franchise) redirect("/franchise/login?error=forbidden");

  return { profile, franchise };
}
