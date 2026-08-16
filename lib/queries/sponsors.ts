import { createClient } from "@/lib/supabase/server";
import { SPONSOR_TIERS, type SponsorTier } from "@/lib/site";
import type { Sponsor } from "@/lib/types";

/** All sponsors, ordered for display. Public-readable table. */
export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getSponsors:", error.message);
    return [];
  }
  return data ?? [];
}

/** Sponsors grouped by tier, in the canonical tier order. */
export async function getSponsorsByTier(): Promise<
  { tier: SponsorTier; sponsors: Sponsor[] }[]
> {
  const sponsors = await getSponsors();
  return SPONSOR_TIERS.map((tier) => ({
    tier,
    sponsors: sponsors.filter((s) => s.tier === tier),
  }));
}
