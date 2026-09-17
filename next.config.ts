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
  // Canonical URL enforcement — all traffic funnels to https://urbansportsstudio.in
  // (no www, no http). Without these redirects Google indexes multiple variants
  // of every page as separate (duplicate) URLs, causing Search Console failures.
  async redirects() {
    return [
      // 1. www → non-www  (THE main fix — Google was seeing www.urbansportsstudio.in
      //    as a separate site because there was no redirect. This caused "Page with
      //    redirect" for 3 pages in Search Console.)
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${PROD_DOMAIN}` }],
        destination: `https://${PROD_DOMAIN}/:path*`,
        permanent: true,
      },
      // 2. HTTP → HTTPS  (belt-and-suspenders; Vercel also does this at the edge)
      {
        source: "/:path*",
        has: [{ type: "host", value: PROD_DOMAIN }],
        destination: `https://${PROD_DOMAIN}/:path*`,
        permanent: true,
        missing: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
      },
    ];
  },
};

export default nextConfig;
