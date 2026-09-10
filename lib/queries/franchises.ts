import { createClient } from "@/lib/supabase/server";

export type PublicFranchise = {
  id: string;
  name: string;
  short_code: string | null;
  owner_name: string | null;
};

/**
 * All franchises for the public Franchises page. `franchises` is anon-readable
 * (RLS: "franchises public read"), so no auth is required. Ordered by name for a
 * stable, alphabetical grid.
 */
export async function getPublicFranchises(): Promise<PublicFranchise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("franchises")
    .select("id, name, short_code, owner_name")
    .order("name");
  if (error) {
    console.error("getPublicFranchises:", error.message);
    return [];
  }
  return data ?? [];
}
