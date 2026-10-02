import type { Metadata } from "next";
import { SectionHeading } from "@/components/site/section-heading";
import { SponsorCard } from "@/components/site/sponsor-card";
import { SponsorEnquiryForm } from "@/components/site/sponsor-enquiry-form";
import { getSponsorsByTier } from "@/lib/queries/sponsors";
import { getLeagueSettings } from "@/lib/queries/settings";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sponsors",
  description: `Partner with ${site.name} ${site.season} — Title, Co-title, Associate and Ground Partner opportunities.`,
};

const TIER_BLURB: Record<string, string> = {
  Title: "The marquee partner — top billing across the league.",
  "Co-title": "Shared headline presence across the season.",
  Associate: "Prominent brand presence at matches and online.",
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
  const hasAny = grouped.some((g) => g.sponsors.length > 0);

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

      {/* Tiers */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl space-y-14 px-5 py-16">
          {grouped
            .filter(({ sponsors }) => sponsors.length > 0)
            .map(({ tier, sponsors }) => {
              const featured = tier === "Title" || tier === "Co-title";
              // "… Partner" tiers already read as a full label; only the
              // Title/Co-title/Associate tiers take the "Sponsor(s)" suffix.
              const isPartnerTier = tier.endsWith("Partner");
              return (
                <div key={tier}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
                      {tier}
                      {!isPartnerTier && (
                        <>
                          {" "}
                          <span className="text-primary">
                            Sponsor{sponsors.length === 1 ? "" : "s"}
                          </span>
                        </>
                      )}
                    </h2>
                    <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {TIER_BLURB[tier]}
                    </span>
                  </div>
                  <hr className="crease-rule mt-3 mb-6 w-full" />

                  <div
                    className={
                      featured
                        ? "grid grid-cols-1 gap-5 sm:grid-cols-2"
                        : "grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4"
                    }
                  >
                    {sponsors.map((s) => (
                      <SponsorCard key={s.id} sponsor={s} featured={featured} />
                    ))}
                  </div>
                </div>
              );
            })}

          {!hasAny && (
            <p className="text-center text-sm text-muted-foreground">
              Partner line-up will be announced soon. Be the first — get in touch.
            </p>
          )}
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
