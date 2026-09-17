import type { NextConfig } from "next";

const PROD_DOMAIN = "urbansportsstudio.in";

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
  // Canonical URL enforcement — funnel www → non-www so Google doesn't index
  // www.urbansportsstudio.in as a separate (duplicate) site.
  //
  // NOTE: HTTP → HTTPS is intentionally NOT handled here. Vercel already forces
  // HTTPS at the edge for custom domains. A next.config redirect that keys off
  // `x-forwarded-proto` is redundant and risks a redirect loop (e.g. Googlebot
  // fetching /sitemap.xml gets 308'd to the same URL), which surfaces as
  // "Couldn't fetch" in Search Console.
  async redirects() {
    return [
      // www → non-www (permanent).
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${PROD_DOMAIN}` }],
        destination: `https://${PROD_DOMAIN}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
