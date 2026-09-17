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
  // Permanently redirect the bare HTTP version to HTTPS so Google only ever
  // indexes one canonical URL. Without this both http:// and https:// are
  // treated as separate pages, causing duplicate-content failures in Search
  // Console.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: PROD_DOMAIN }],
        destination: `https://${PROD_DOMAIN}/:path*`,
        permanent: true, // 308 (preserves method); Google treats as 301
        // Only fires if the request arrived over HTTP (i.e. missing https header).
        missing: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
      },
    ];
  },
};

export default nextConfig;
