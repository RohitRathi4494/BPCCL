import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing target for the password-reset email link. Supabase appends a PKCE
 * `code` (or, on error, `error`/`error_description`) to this URL. We exchange
 * the code for a recovery session, then forward the owner to the form where
 * they choose a new password.
 *
 * Kept as a GET route handler (not a page) so the code→session exchange writes
 * the auth cookies onto the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      `${origin}/franchise/forgot-password?error=expired`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/franchise/forgot-password?error=expired`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/franchise/forgot-password?error=expired`,
    );
  }

  return NextResponse.redirect(`${origin}/franchise/update-password`);
}
