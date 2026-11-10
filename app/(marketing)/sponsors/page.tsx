import type { Metadata } from "next";
import { SectionHeading } from "@/components/site/section-heading";
import { SponsorCard } from "@/components/site/sponsor-card";
import { SponsorEnquiryForm } from "@/components/site/sponsor-enquiry-form";
import { getSponsorsByTier } from "@/lib/queries/sponsors";
import { getLeagueSettings } from "@/lib/queries/settings";
import { site, SPONSOR_TIERS, type SponsorTier } from "@/lib/site";
import type { Sponsor } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sponsors",
  description: `Partner with ${site.name} ${site.season} — Title, Co-title, Associate and Ground Partner opportunities.`,
};

const TIER_BLURB: Record<string, string> = {
  Title: "The marquee partner — top billing across the league.",
  "Co-title": "Shared headline presence across the season.",
  Associate: "Prominent brand presence at matches and online.",
  "Style Partner": "Dressing the league in signature style.",
  "Statistics Partner": "Powers the numbers behind every match.",
  "Healthcare Partner": "Keeping our players match-fit all season.",
  "Media Partner": "Bringing the league to screens everywhere.",
  "Ground Partner": "On-ground visibility at Champions Den.",
};

export default async function SponsorsPage() {
  const [grouped, settings] = await Promise.all([
    getSponsorsByTier(),
    getLeagueSettings(),
  ]);

  // Marquee tiers get the wide spotlight; everyone else lands in one organised
  // "Our Partners" wall with a tier chip on each card.
  const marqueeTiers = new Set(["Title", "Co-title"]);
  const spotlights = grouped
    .filter((g) => marqueeTiers.has(g.tier) && g.sponsors.length > 0)
    .flatMap((g) => g.sponsors.map((s) => ({ sponsor: s, tier: g.tier })));
  const partners = grouped
    .filter((g) => !marqueeTiers.has(g.tier) && g.sponsors.length > 0)
    .flatMap((g) => g.sponsors.map((s) => ({ sponsor: s, tier: g.tier })));

  const total = spotlights.length + partners.length;

  return (
    <>
      {/* Header */}
      <section className="lamp-glow">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-10">
          <span className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
            Partnerships
          </span>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-6xl">
            Put your brand under the lights
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/85">
            {site.name} {site.season} brings {settings?.franchise_count ?? 14}{" "}
            franchises, a live auction and a full season of T20 cricket
            to {site.venue.city}.
            Align your brand with the action.
          </p>
        </div>
      </section>

      {/* Partner line-up */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl space-y-12 px-5 py-16">
          {/* Marquee spotlight(s) */}
          {spotlights.length > 0 && (
            <div className="space-y-5">
              {spotlights.map(({ sponsor, tier }) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  variant="spotlight"
                  tierLabel={tier === "Title" ? "Title Partner" : tier}
                />
              ))}
            </div>
          )}

          {/* Everyone else — one tidy wall, each card chipped with its tier. */}
          {partners.length > 0 && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
                  Our <span className="text-primary">Partners</span>
                </h2>
                <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  The brands powering the season
                </span>
              </div>
              <hr className="crease-rule mt-3 mb-6 w-full" />
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {partners.map(({ sponsor, tier }) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    tierLabel={tier}
                  />
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Partner line-up will be announced soon. Be the first — get in touch.
            </p>
          )}

          {/* Open slots — what's still available to sponsor. */}
          <OpenSlots taken={grouped.filter((g) => g.sponsors.length > 0)} />
        </div>
      </section>

      {/* Enquiry */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <SectionHeading
            kicker="Get In Touch"
            title="Sponsor Enquiry"
            align="center"
          />
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted-foreground">
            Tell us a little about your brand and the tier you&apos;re
            interested in. Our partnerships team will follow up directly.
          </p>
          <div className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
            <SponsorEnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * The tiers that still have no sponsor — shown as a tidy "available" row so the
 * page doubles as a clear pitch for what's left to claim.
 */
function OpenSlots({
  taken,
}: {
  taken: { tier: SponsorTier; sponsors: Sponsor[] }[];
}) {
  const takenTiers = new Set(taken.map((g) => g.tier));
  const open = SPONSOR_TIERS.filter((t) => !takenTiers.has(t));
  if (open.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-card/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-xl font-bold tracking-tight text-foreground uppercase">
          Open <span className="text-accent">slots</span>
        </h3>
        <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Available to sponsor
        </span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {open.map((tier) => (
          <div
            key={tier}
            className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/30 p-4"
          >
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-accent" />
            <div>
              <p className="font-heading text-sm font-bold tracking-wide text-foreground uppercase">
                {tier}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {TIER_BLURB[tier]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
