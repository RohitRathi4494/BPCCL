import { createClient } from "@/lib/supabase/server";
import type { LeagueSettings } from "@/lib/types";

/**
 * Fetch the single league_settings row (public-readable). Returns null if the
 * row hasn't been seeded yet, so callers can fall back gracefully.
 */
export async function getLeagueSettings(): Promise<LeagueSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLeagueSettings:", error.message);
    return null;
  }
  return data;
}

/** Coerce the `categories` jsonb column into a string[]. */
export function settingsCategories(settings: LeagueSettings | null): string[] {
  if (!settings?.categories) return [];
  return Array.isArray(settings.categories)
    ? (settings.categories as string[])
    : [];
}
