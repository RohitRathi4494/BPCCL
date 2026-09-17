import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the brand logo ships with the serverless functions so transactional
  // emails can embed it as an inline (CID) attachment at runtime.
  outputFileTracingIncludes: {
    "/**": ["./public/uscl-logo.png"],
  },
  images: {
    remotePatterns: [
      {
        // Supabase Storage (sponsor logos, player photos, match media).
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // NOTE: www <-> non-www and http -> https canonicalization are intentionally
  // NOT handled here. Vercel does this at the edge based on which domain is set
  // as the Production domain in Project → Settings → Domains. A host-based
  // redirect in next.config FIGHTS Vercel's edge redirect and creates an
  // infinite loop (ERR_TOO_MANY_REDIRECTS): Vercel sends non-www → www, then
  // this config sent www → non-www, forever. Keep canonicalization in ONE place
  // (Vercel domains). Set the canonical host there to non-www
  // (urbansportsstudio.in) so it matches PROD_SITE_URL in lib/site.ts.
};

export default nextConfig;
