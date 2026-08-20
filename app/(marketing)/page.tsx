import Link from "next/link";
import Image from "next/image";
import { MapPin, Trophy, Users, Wallet, Gavel } from "lucide-react";
import { StatusBadge } from "@/components/site/status-badge";
import { Countdown } from "@/components/site/countdown";
import { SectionHeading } from "@/components/site/section-heading";
import { SponsorCard } from "@/components/site/sponsor-card";
import { Reveal } from "@/components/site/reveal";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { getSponsors } from "@/lib/queries/sponsors";
import { site } from "@/lib/site";

export default async function HomePage() {
  const settings = await getLeagueSettings();
  const categories = settingsCategories(settings);
  const sponsors = await getSponsors();
  const featured = sponsors.filter(
    (s) => s.tier === "Title" || s.tier === "Co-title",
  );

  const purse = settings
    ? new Intl.NumberFormat("en-IN").format(settings.purse_per_franchise)
    : null;

  const stats = [
    {
      icon: Users,
      value: settings ? String(settings.franchise_count) : "16",
      label: "Franchises",
    },
    {
      icon: Wallet,
      value: purse ?? "—",
      label: "Mock Purse / Team",
    },
    {
      icon: Trophy,
      value: categories.length ? String(categories.length) : "4",
      label: "Player Categories",
    },
    {
      icon: Gavel,
      value: settings
        ? `${settings.squad_min_per_franchise}–${settings.squad_max_per_franchise}`
        : "17–22",
      label: "Squad Size",
    },
  ];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* Desktop: full-bleed champions background + overlay for legibility */}
        <div className="absolute inset-0 hidden lg:block">
          <Image
            src="/hero-champions.jpg"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[var(--navy)]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy)]/85 via-[var(--navy)]/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-transparent to-transparent" />
        </div>

        {/* Mobile/tablet: the complete champions photo, uncropped, at the top */}
        <div className="relative lg:hidden">
          <Image
            src="/hero-champions.jpg"
            alt="USCL Season 2 champions lifting the trophy"
            width={2400}
            height={1628}
            priority
            unoptimized
            sizes="100vw"
            className="h-auto w-full"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--navy)] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-8 pb-16 lg:pt-28">
          <div className="flex flex-col-reverse items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:flex-1">
              <StatusBadge status="open" />

              <h1 className="mt-6 font-heading text-5xl font-extrabold tracking-tight text-foreground uppercase sm:text-7xl">
                Urban Sports
                <br />
                Champions League
              </h1>

              <div className="mt-5 h-1.5 w-20 rounded-full bg-[var(--lime)]" />

          <p className="mt-5 max-w-xl font-mono text-sm tracking-[0.16em] text-muted-foreground uppercase">
            {site.tagline} · {site.season}
          </p>
          <p className="mt-3 flex items-center gap-2 text-foreground/85">
            <MapPin className="size-4 text-primary" />
            {site.venue.full}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_24px_rgba(61,123,239,0.35)] transition-shadow hover:shadow-[0_0_34px_rgba(61,123,239,0.6)]"
            >
              Register to Play
            </Link>
            <Link
              href="/sponsors"
              className="inline-flex items-center rounded-sm border border-border bg-card px-6 py-3 font-heading text-sm font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary/50"
            >
              Become a Sponsor
            </Link>
          </div>
            </div>
          </div>

          {/* Countdowns — key season dates from league_settings (admin-editable).
              Season start may be a window (a note) rather than an exact date. */}
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            <Countdown
              target={settings?.registration_closes_at ?? null}
              title="Registration Closes"
            />
            <Countdown
              target={settings?.auction_day_at ?? null}
              title="Auction Day"
            />
            <Countdown
              target={settings?.season_starts_at ?? null}
              title="Season Starts"
              placeholder={settings?.season_starts_note ?? "To be announced"}
            />
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="border-y border-border bg-[var(--card)]">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-2 px-5 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 px-4 py-10 text-center"
            >
              <s.icon className="mb-1 size-5 text-[var(--lime)]" />
              <span className="font-heading text-4xl font-bold text-[var(--cream)] sm:text-5xl">
                {s.value}
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--cream)]/60 uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ================= REGISTRATION ================= */}
      <section id="register" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading kicker="Step 01" title="Player Registration" />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <p className="text-lg leading-relaxed text-foreground/85">
              Any player can enter the pool. Submit your details and your
              CricHeroes profile — our reviewers assign you a category
              {categories.length ? ` (${categories.join(", ")})` : ""} ahead of
              the live auction, where all {settings?.franchise_count ?? 16}{" "}
              franchises bid to build their squads.
            </p>
            <div className="card-glow flex flex-col justify-center gap-4 rounded-lg border border-primary/50 bg-card p-8">
              <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
                Registration is open
              </p>
              <p className="text-sm text-muted-foreground">
                No account needed — it&apos;s a quick public form. Open to
                players aged 30 and above.
              </p>
              <Link
                href="/register"
                className="inline-flex w-fit items-center rounded-sm bg-primary px-5 py-2.5 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)]"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VENUE ================= */}
      <section id="venue" className="scroll-mt-24 border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading kicker="The Ground" title="Champions Den" />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <p className="text-lg leading-relaxed text-foreground/85">
              Every match of {site.shortName} {site.season} is played under
              lights at{" "}
              <span className="text-primary">Champions Den, Bandhwari</span> in{" "}
              {site.venue.city} — the home of the league. Floodlit T20
              cricket, sixteen franchises, one ground.
            </p>
            <div className="relative overflow-hidden rounded-lg border border-border">
              <Image
                src="/ground.png"
                alt={`${site.venue.name} — ${site.venue.area}, ${site.venue.city}`}
                width={1448}
                height={1086}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="h-full min-h-56 w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--navy)] via-[var(--navy)]/70 to-transparent p-5 pt-12">
                <p className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground uppercase">
                  <MapPin className="size-5 shrink-0 text-primary" />
                  {site.venue.name}
                </p>
                <p className="mt-1 pl-7 text-sm text-muted-foreground">
                  {site.venue.area}, {site.venue.city}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SPONSORS ================= */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading
            kicker="Powered By"
            title="Our Partners"
            align="center"
          />
          {featured.length > 0 ? (
            <Reveal className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {featured.map((s) => (
                <SponsorCard key={s.id} sponsor={s} />
              ))}
            </Reveal>
          ) : (
            <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-lg border border-dashed border-primary/40 bg-card p-10 text-center">
              <p className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
                This spot is open
              </p>
              <p className="text-sm text-muted-foreground">
                Put your brand in front of sixteen franchises and a season of
                floodlit T20 cricket. Title, Co-title, Associate and Ground
                Partner slots are available.
              </p>
              <Link
                href="/sponsors"
                className="mt-1 inline-flex items-center rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase"
              >
                Become a Sponsor
              </Link>
            </div>
          )}
          <div className="mt-8 text-center">
            <Link
              href="/sponsors"
              className="font-mono text-xs tracking-[0.2em] text-primary uppercase hover:underline"
            >
              View all partners →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
