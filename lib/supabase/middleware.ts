import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated auth cookies to both the request and the response. Wired up in the
 * root `proxy.ts` (Next.js 16's renamed middleware convention).
 *
 * Without this, server-side auth tokens can silently expire and signed-in
 * admins / franchise owners / scorers would get logged out unexpectedly.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run any code between creating the client above and the
  // getUser() call below. Doing so risks hard-to-debug session bugs where the
  // user appears randomly logged out. Keep this call here and nothing before it.
  await supabase.auth.getUser();

  return supabaseResponse;
}
