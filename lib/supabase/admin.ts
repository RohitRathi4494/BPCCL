import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client that BYPASSES Row Level Security.
 *
 * ⚠️ SERVER-ONLY. Never import this into a Client Component or expose the
 * service role key to the browser. Use it sparingly, only for trusted
 * server-side admin operations that genuinely need to skip RLS (e.g. certain
 * batch registration-review or auction-setup tasks). For everything else, use
 * the RLS-respecting clients in `client.ts` / `server.ts`.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
