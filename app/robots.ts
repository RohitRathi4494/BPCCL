import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Generates /robots.txt. Allows crawling of the public site, blocks the private
 * consoles and API, and points crawlers at the sitemap.
 */
// Private areas that no crawler — search or AI — should index.
const DISALLOW = ["/admin", "/franchise", "/auction", "/api"];

// AI / LLM crawlers we explicitly welcome onto the public site. Listing them by
// name (rather than relying on the "*" catch-all) makes our stance unambiguous
// and satisfies AI-readiness checks that look for named agent rules.
const AI_AGENTS = [
  "GPTBot", // OpenAI
  "OAI-SearchBot", // OpenAI search
  "ChatGPT-User", // ChatGPT browsing
  "ClaudeBot", // Anthropic
  "Claude-User", // Anthropic (Claude browsing)
  "anthropic-ai", // Anthropic (legacy)
  "Google-Extended", // Google Gemini / Vertex
  "PerplexityBot", // Perplexity
  "Perplexity-User", // Perplexity browsing
  "Applebot-Extended", // Apple Intelligence
  "Bytespider", // ByteDance
  "CCBot", // Common Crawl
  "Meta-ExternalAgent", // Meta AI
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      // Named AI agents: same access as everyone — the public site is open to
      // them, the private consoles are not.
      {
        userAgent: AI_AGENTS,
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
