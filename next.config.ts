import type { NextConfig } from "next";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

// Allowed external image hosts. `unoptimized: true` serves images as-is (no
// optimizer), but we still list hosts to match the repo convention and keep
// next/image happy. This does NOT touch any redirect/canonicalization config.
const remotePatterns: RemotePattern[] = [
  {
    // Supabase Storage (sponsor logos, legacy/fallback player photos, media).
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
  {
    // Cloudflare R2 default public bucket domain (pub-xxxx.r2.dev).
    protocol: "https",
    hostname: "**.r2.dev",
    pathname: "/**",
  },
  {
    // YouTube video thumbnails (i.ytimg.com/vi/<id>/hqdefault.jpg) used as
    // lite-embed posters for hand-picked testimonial / ground videos.
    protocol: "https",
    hostname: "i.ytimg.com",
    pathname: "/vi/**",
  },
];

// If a custom R2 public domain is configured, allow it too.
try {
  if (process.env.R2_PUBLIC_URL) {
    const host = new URL(process.env.R2_PUBLIC_URL).hostname;
    if (!remotePatterns.some((p) => p.hostname === host)) {
      remotePatterns.push({ protocol: "https", hostname: host, pathname: "/**" });
    }
  }
} catch {
  // Ignore an unparseable R2_PUBLIC_URL — the r2.dev pattern above still covers
  // the default public bucket domain.
}

const nextConfig: NextConfig = {
  // Ensure the brand logo ships with the serverless functions so transactional
  // emails can embed it as an inline (CID) attachment at runtime.
  // Keep this path in sync with leagueConfig.logos.email.
  outputFileTracingIncludes: {
    "/**": ["./public/brand/bpccl-logo.png"],
  },
  images: {
    // Disable Vercel's on-demand Image Optimization so the project stays within
    // the Hobby (free) plan. next/image still works — it serves the original
    // source file without any server-side resize/quality transformation.
    unoptimized: true,
    remotePatterns,
  },
  // NOTE: www <-> non-www and http -> https canonicalization are intentionally
  // NOT handled here. Vercel does this at the edge based on which domain is set
  // as the Production domain in Project → Settings → Domains. A host-based
  // redirect in next.config FIGHTS Vercel's edge redirect and creates an
  // infinite loop (ERR_TOO_MANY_REDIRECTS): Vercel sends non-www → www, then
  // this config sent www → non-www, forever. Keep canonicalization in ONE place
  // (Vercel domains). Set the canonical host there to match PROD_SITE_URL
  // (sourced from leagueConfig.prodSiteUrl in lib/site.ts).
};

export default nextConfig;
