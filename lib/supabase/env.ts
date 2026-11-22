/**
 * Required-environment guard for the Supabase clients.
 *
 * This project has its OWN Supabase backend — it must never silently fall back
 * to another league's project. If a required variable is missing we throw a
 * clear, actionable error instead of letting the SDK construct a client against
 * `undefined` (which fails later with an opaque message).
 *
 * NEXT_PUBLIC_* vars are inlined into the browser bundle at build time, so this
 * check works in both server and client code.
 */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `[config] Missing required environment variable ${name}. ` +
        `This project needs its own Supabase project — copy .env.example to ` +
        `.env.local and set ${name}. Never reuse another league's backend.`,
    );
  }
  return v.trim();
}
