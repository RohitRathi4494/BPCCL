import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Generates /sitemap.xml. Lists only the public, indexable content pages —
 * admin / franchise / auction consoles are private and excluded (also blocked
 * in robots.ts). Add /franchises, /fixtures, and live scorecard routes here as
 * those pages ship.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/sponsors`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
