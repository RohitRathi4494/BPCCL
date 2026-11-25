import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { MediaGallery } from "@/components/site/media-gallery";
import { TestimonialsRow } from "@/components/site/testimonials-row";
import { ClientMarquee } from "@/components/site/client-logos";
import { FactsStrip } from "@/components/site/ground-facts";
import { StatCounter } from "@/components/site/stat-counter";
import {
  getGroundPhotos,
  getGroundVideos,
  getGroundFacts,
  getClients,
} from "@/lib/queries/ground";
import type { LeagueSettings } from "@/lib/types";

const DEFAULT_TAGLINE = "Where international cricketers train. Now it's your turn.";

/**
 * The three Ground & Trust home sections (THE GROUND / HEARD ON THE GROUND /
 * TRUSTED BY). Each renders only when it has visible data, so an empty table
 * means the whole section disappears cleanly.
 */
export async function HomeGroundSections({ settings }: { settings: LeagueSettings | null }) {
  const [photos, facts, videos, clients] = await Promise.all([
    getGroundPhotos("ground"),
    getGroundFacts(),
    getGroundVideos("testimonial", 6),
    getClients(),
  ]);

  const tagline = settings?.ground_tagline?.trim() || DEFAULT_TAGLINE;
  const channelUrl = settings?.youtube_channel_url?.trim() || null;
  const statClients = settings?.stat_clients ?? null;
  const statYears = settings?.stat_years ?? null;
  const statMatches = settings?.stat_matches_hosted ?? null;
  const hasStats = [statClients, statYears, statMatches].some((v) => typeof v === "number" && v > 0);

  return (
    <>
      {/* ===================== A. THE GROUND ===================== */}
      {(photos.length > 0 || facts.length > 0) && (
        <section id="ground" className="scroll-mt-24 bg-cream-100">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <Reveal className="flex flex-col gap-4">
              <Eyebrow brackets="square" className="text-gold-600">
                THE HOME OF BPCCL
              </Eyebrow>
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <h2 className="editorial-heading max-w-2xl text-4xl text-navy-900 sm:text-5xl">
                  {tagline}
                </h2>
                <Link
                  href="/ballpark"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-gold-600"
                >
                  Explore the ground <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </Reveal>

            {photos.length > 0 && (
              <div className="mt-12">
                <MediaGallery photos={photos} layout="feature" />
              </div>
            )}

            {facts.length > 0 && <FactsStrip facts={facts} tone="light" className="mt-10" />}
          </div>
        </section>
      )}

      {/* ================= B. HEARD ON THE GROUND ================= */}
      {videos.length > 0 && (
        <section id="voices" className="scroll-mt-24 bg-navy-950 text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <Reveal className="mb-8 flex flex-col gap-4">
              <Eyebrow brackets="square" className="text-gold-400">
                FROM THE PROS
              </Eyebrow>
              <h2 className="editorial-heading max-w-2xl text-4xl sm:text-5xl">
                Don&apos;t take our word for it.
              </h2>
            </Reveal>
            <TestimonialsRow videos={videos} channelUrl={channelUrl} seeAllHref="/ballpark#videos" />
          </div>
        </section>
      )}

      {/* ===================== C. TRUSTED BY ===================== */}
      {clients.length > 0 && (
        <section className="border-y border-navy-900/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <div className="mb-10 flex flex-col gap-3">
              <Eyebrow brackets="square" className="text-gold-600">
                OUR CLIENTS
              </Eyebrow>
              <h2 className="editorial-heading text-3xl text-navy-900 sm:text-4xl">
                {statClients && statClients > 0
                  ? `Trusted by ${statClients}+ companies`
                  : "Trusted by leading companies"}
              </h2>
            </div>

            <ClientMarquee clients={clients} />

            {hasStats && (
              <div className="mt-12 grid gap-8 border-t border-navy-900/10 pt-10 sm:grid-cols-3">
                {statClients && statClients > 0 ? (
                  <StatCounter value={statClients} suffix="+" label="Corporate clients" tone="light" />
                ) : null}
                {statYears && statYears > 0 ? (
                  <StatCounter value={statYears} suffix="+" label="Years running" tone="light" />
                ) : null}
                {statMatches && statMatches > 0 ? (
                  <StatCounter value={statMatches} suffix="+" label="Matches hosted" tone="light" />
                ) : null}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
