import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Generates /robots.txt. Allows crawling of the public site, blocks the private
 * consoles and API, and points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/franchise", "/auction", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
