import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads/writes the auth session from the request cookies.
 *
 * Uses the public anon key, so queries respect Row Level Security and the
 * currently signed-in user's role. Call it per-request (do not cache the
 * returned client across requests).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where setting
            // cookies is not allowed. Safe to ignore — the middleware
            // (see proxy.ts) refreshes the session on every request.
          }
        },
      },
    },
  );
}
