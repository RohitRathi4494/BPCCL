import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { requireEnv } from "@/lib/supabase/env";

/**
 * Supabase client for use in Client Components (runs in the browser).
 *
 * Uses the public anon key, so every request is subject to Row Level
 * Security. Import this in `"use client"` components — e.g. the live auction
 * room and live scoring views that subscribe to Supabase Realtime.
 */
export function createClient() {
  return createBrowserClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
