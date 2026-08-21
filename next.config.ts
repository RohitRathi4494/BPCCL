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
};

export default nextConfig;
