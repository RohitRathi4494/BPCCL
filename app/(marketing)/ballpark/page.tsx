import type { Metadata } from "next";
import { MessageCircle, Phone, Navigation } from "lucide-react";
import { Eyebrow, RollButton } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { GroundHero } from "@/components/site/ground-hero";
import { MediaGallery } from "@/components/site/media-gallery";
import { ClientWall } from "@/components/site/client-logos";
import { FactsGrid } from "@/components/site/ground-facts";
import { MapEmbed } from "@/components/site/map-embed";
import { getLeagueSettings } from "@/lib/queries/settings";
import {
  getGroundPhotos,
  getGroundFacts,
  getClients,
} from "@/lib/queries/ground";
import { getVisibleReels } from "@/lib/queries/reels";
import { ReelsSection } from "@/components/site/reels-section";
import { publicStorageConfigured, publicObjectUrl } from "@/lib/storage";
import { whatsappLink, telLink, mapsEmbedSrc } from "@/lib/ground/contact";
import { leagueConfig } from "@/lib/league.config";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

const DEFAULT_TAGLINE = "Where international cricketers train. Now it's your turn.";
const BOOK_MESSAGE = "Hi, I'd like to enquire about booking Ballpark.";

function urlFor(key: string | null | undefined): string | null {
  return key && publicStorageConfigured() ? publicObjectUrl(key) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, photos] = await Promise.all([getLeagueSettings(), getGroundPhotos("ground")]);
  const og = photos.find((p) => p.isFeatured)?.src ?? photos[0]?.src;
  const groundName = settings?.ground_name?.trim() || "Ballpark";
  return {
    title: "Ballpark — Premium Cricket Ground | BPCCL",
    description:
      settings?.ground_tagline?.trim() ||
      `${groundName} — the premium floodlit cricket ground where ${site.name} is played. Explore the facilities, player feedback and book the ground.`,
    openGraph: og ? { images: [{ url: og }] } : undefined,
  };
}

export default async function BallparkPage() {
  const [settings, photos, facts, clients, reels] = await Promise.all([
    getLeagueSettings(),
    getGroundPhotos(),
    getGroundFacts(),
    getClients(),
    getVisibleReels(),
  ]);

  const tagline = settings?.ground_tagline?.trim() || DEFAULT_TAGLINE;
  const groundName = settings?.ground_name?.trim() || null;
  const address = settings?.ground_address?.trim() || null;

  const heroVideo = urlFor(settings?.hero_video_r2_key);
  // Hero image priority: an admin-set hero poster, else a gallery photo the admin
  // explicitly marked "Featured", else a FIXED brand image. We deliberately do
  // NOT fall back to photos[0] — that made the venue hero change every time a new
  // gallery photo was uploaded. To pick a specific ground photo for the hero,
  // mark it "Featured" in the admin, or upload a dedicated hero poster.
  const heroPoster =
    urlFor(settings?.hero_poster_r2_key) ??
    photos.find((p) => p.isFeatured)?.src ??
    leagueConfig.logos.hero;

  const bookHref = whatsappLink(settings?.ground_whatsapp, BOOK_MESSAGE);
  const enquireHref = whatsappLink(settings?.ground_whatsapp);
  const phoneHref = telLink(leagueConfig.contactPhone);
  const mapSrc = mapsEmbedSrc({
    lat: settings?.ground_lat ?? null,
    lng: settings?.ground_lng ?? null,
    address,
  });
  const directionsHref = settings?.ground_map_url?.trim() || null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: groundName ?? `${site.name} Ground`,
    url: `${leagueConfig.prodSiteUrl}/ballpark`,
  };
  if (address) jsonLd.address = address;
  if (typeof settings?.ground_lat === "number" && typeof settings?.ground_lng === "number") {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: settings.ground_lat,
      longitude: settings.ground_lng,
    };
  }
  if (heroPoster) jsonLd.image = heroPoster;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ===================== 1. HERO ===================== */}
      <GroundHero videoUrl={heroVideo} posterUrl={heroPoster}>
        <div className="mx-auto w-full max-w-6xl px-5 pb-12 sm:pb-16">
          {groundName && <Eyebrow className="text-white/80">{groundName}</Eyebrow>}
          {/* Self-fitting wordmark: textLength locks the word to the viewBox
              width and the SVG scales to the container, so "BALLPARK" always
              shows in full and never clips (same trick as the footer). */}
          <h1 className="mt-3 text-white">
            <span className="sr-only">Ballpark</span>
            <svg
              aria-hidden
              role="presentation"
              viewBox="0 0 1000 200"
              className="block w-full select-none overflow-visible"
            >
              <text
                x="0"
                y="165"
                textAnchor="start"
                textLength="1000"
                lengthAdjust="spacingAndGlyphs"
                fill="currentColor"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontSize: "190px",
                  letterSpacing: "-0.02em",
                }}
              >
                BALLPARK
              </text>
            </svg>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">{tagline}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <RollButton href="/register" variant="gold">
              Register for BPCCL
            </RollButton>
            {bookHref && (
              <RollButton href={bookHref} variant="outline-dark">
                Book the ground
              </RollButton>
            )}
          </div>
        </div>
      </GroundHero>

      {/* ===================== 2. FACILITIES ===================== */}
      {facts.length > 0 && (
        <section className="bg-navy-950 text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <Reveal className="mb-10 flex flex-col gap-3">
              <Eyebrow variant="script" className="text-gold-400">
                The facilities
              </Eyebrow>
              <h2 className="editorial-heading text-4xl text-white sm:text-5xl">
                Built for serious cricket.
              </h2>
            </Reveal>
            <FactsGrid facts={facts} />
          </div>
        </section>
      )}

      {/* ===================== 3. GALLERY ===================== */}
      {photos.length > 0 && (
        <section id="gallery" className="scroll-mt-24 bg-cream-100">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <Reveal className="mb-10 flex flex-col gap-3">
              <Eyebrow variant="script" className="text-gold-600">
                Take a look around
              </Eyebrow>
              <h2 className="editorial-heading text-4xl text-navy-900 sm:text-5xl">The gallery</h2>
            </Reveal>
            <MediaGallery photos={photos} layout="masonry" />
          </div>
        </section>
      )}

      {/* ============ 4. REELS (shared with the home page) ============
          The same admin-managed reels shown on the home page also render here,
          so the venue page carries the player / personality feedback clips. */}
      {reels.length > 0 && (
        <ReelsSection reels={reels} channelUrl={settings?.youtube_channel_url ?? null} />
      )}

      {/* ===================== 5. CLIENTS ===================== */}
      {clients.length > 0 && (
        <section className="bg-cream-100">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <Reveal className="mb-10 flex flex-col gap-3">
              <Eyebrow variant="script" className="text-gold-600">
                Our clients
              </Eyebrow>
              <h2 className="editorial-heading text-3xl text-navy-900 sm:text-4xl">
                Trusted by leading companies
              </h2>
            </Reveal>
            <ClientWall clients={clients} />
          </div>
        </section>
      )}

      {/* ===================== 6. VISIT US ===================== */}
      {(address || mapSrc || enquireHref || phoneHref) && (
        <section className="bg-cream-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:py-24 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Eyebrow variant="script" className="text-gold-600">
                Come see it
              </Eyebrow>
              <h2 className="editorial-heading text-4xl text-navy-900 sm:text-5xl">Visit us</h2>
              {address && <p className="max-w-md text-muted-ink">{address}</p>}
              <div className="mt-2 flex flex-wrap gap-3">
                {enquireHref && (
                  <a
                    href={enquireHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                )}
                {phoneHref && (
                  <a
                    href={phoneHref}
                    className="inline-flex items-center gap-2 rounded-full border border-navy-900/20 px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:border-gold-400"
                  >
                    <Phone className="size-4" /> Call
                  </a>
                )}
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-navy-900/20 px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:border-gold-400"
                  >
                    <Navigation className="size-4" /> Get directions
                  </a>
                )}
              </div>
            </div>
            {mapSrc && <MapEmbed src={mapSrc} label={groundName ?? "Ballpark"} />}
          </div>
        </section>
      )}

      {/* ===================== 7. CLOSING CTA ===================== */}
      <section className="bg-gold-400">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="editorial-heading max-w-xl text-4xl text-navy-950 sm:text-5xl">
            Play where the pros practice.
          </h2>
          <RollButton href="/register" variant="navy" className="shrink-0">
            Register Now
          </RollButton>
        </div>
      </section>
    </>
  );
}
