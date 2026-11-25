import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, ArrowUpRight } from "lucide-react";
import {
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
} from "@/components/site/social-icons";
import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings } from "@/lib/queries/settings";
import { getSponsors } from "@/lib/queries/sponsors";
import { getPublicFranchises } from "@/lib/queries/franchises";
import { getVisibleFaqs } from "@/lib/queries/ground";
import { ageRuleChip } from "@/lib/ground/age";
import { renderFaqAnswer } from "@/lib/ground/faq";
import { SeasonEventsJsonLd } from "@/components/site/structured-data";
import { Reveal } from "@/components/site/reveal";
import { CountdownChip } from "@/components/site/countdown-chip";
import { Accordion } from "@/components/site/accordion";
import { StatCounter } from "@/components/site/stat-counter";
import { FoundersSection } from "@/components/site/founders-section";
import {
  Eyebrow,
  DisplayWordmark,
  RollButton,
  Marquee,
  BallGlyph,
  Chip,
  AvatarStack,
  DateTile,
  GlassCaption,
} from "@/components/site/primitives";
import { site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";

export const dynamic = "force-dynamic";

function fmtDateTime(iso: string | null): { day: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Kolkata",
    }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
}

function icsHref(title: string, iso: string): string {
  return `/api/ics?title=${encodeURIComponent(title)}&date=${encodeURIComponent(iso)}`;
}

export default async function HomePage() {
  const [settings, sponsors, franchises, faqs] = await Promise.all([
    getLeagueSettings(),
    getSponsors(),
    getPublicFranchises(),
    getVisibleFaqs(),
  ]);

  // Approved-player count (public view). Shown only when it's a meaningful
  // number. TODO: a dedicated public "registered" count RPC if the raw
  // registration total should be shown instead of approved players.
  const supabase = await createClient();
  const { count: approvedCount } = await supabase
    .from("players_public")
    .select("id", { count: "exact", head: true });
  const registeredCount = approvedCount ?? 0;

  const open = settings?.registration_open !== false;
  const teamCount = settings?.franchise_count ?? franchises.length;
  const socials = leagueConfig.socials;

  const dates = [
    { key: "reg", label: "Registration closes", iso: settings?.registration_closes_at ?? null },
    { key: "auction", label: "Player auction", iso: settings?.auction_day_at ?? null },
    { key: "season", label: "Season starts", iso: settings?.season_starts_at ?? null },
  ].filter((d) => d.iso);

  const nextDate = dates[0] ?? null;
  const auctionFmt = fmtDateTime(settings?.auction_day_at ?? null);

  // "How it works" stats — read from league_settings; a null/0 value is HIDDEN,
  // never shown as 0 (the old 0/0/0 trust bug).
  const statItems = [
    { value: settings?.franchise_count ?? franchises.length, label: "Franchises" },
    { value: settings?.squad_max ?? 0, label: "Squad cap" },
    { value: settings?.matchday_size ?? 0, label: "Play each match" },
  ].filter((s) => typeof s.value === "number" && s.value > 0);

  // FAQ copy lives in the `faqs` table; tokens ({{age_rule}}, {{fee_clause}}) are
  // resolved from settings so the age rule + fee have one source and ₹0 is never
  // shown. Empty answers (e.g. an un-set refund policy) are skipped.
  const faqItems = faqs
    .map((f) => ({ id: f.id, title: f.question, body: renderFaqAnswer(f.answer, settings ?? {}) }))
    .filter((f) => f.body.length > 0);

  const heroSocials = [
    { label: "Instagram", href: socials.instagram, Icon: InstagramIcon },
    { label: "LinkedIn", href: socials.linkedin, Icon: LinkedInIcon },
    { label: "WhatsApp", href: socials.whatsapp, Icon: WhatsAppIcon },
  ].filter((s) => s.href);

  return (
    <>
      <SeasonEventsJsonLd settings={settings} />

      {/* ========================= HERO ========================= */}
      <section className="relative h-svh min-h-[640px] w-full overflow-hidden bg-navy-950">
        <Image
          src={leagueConfig.logos.hero}
          alt="A corporate cricket ground at dusk under floodlights"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/90 via-navy-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-transparent to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col px-5 pt-24 pb-8 sm:pt-28">
          {/* top row — crest + registration status */}
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
              <span
                className={`size-1.5 rounded-full ${open ? "animate-pulse bg-gold-400" : "bg-muted-dusk"}`}
                aria-hidden
              />
              <span className="eyebrow text-white/90">
                {open ? "Registrations Open" : "Registrations Closed"}
              </span>
            </span>
            <Image
              src={leagueConfig.logos.main}
              alt={`${site.name} crest`}
              width={260}
              height={272}
              priority
              className="h-20 w-auto drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] sm:h-28"
            />
          </div>

          {/* giant wordmark */}
          <div className="mt-6 flex flex-1 flex-col items-end justify-start text-right">
            <Eyebrow className="text-white/80">
              {site.name} · {site.season}
            </Eyebrow>
            <DisplayWordmark className="mt-2 text-[clamp(4.5rem,20vw,14rem)] text-white">
              {site.shortName}
            </DisplayWordmark>
          </div>

          {/* bottom row */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md">
              <div className="flex flex-wrap items-center gap-3">
                <RollButton href="/register" variant="gold">
                  {open ? "Register Now" : "View Teams"}
                </RollButton>
                {open && nextDate && (
                  <CountdownChip target={nextDate.iso} label="Closes in" />
                )}
              </div>
              <p className="eyebrow mt-4 max-w-sm text-white/75">
                Corporate professionals. A real player auction. Real teams. Play the
                most competitive corporate T20 league around.
              </p>
            </div>

            {heroSocials.length > 0 && (
              <div className="flex gap-2.5">
                {heroSocials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-white/25 text-white transition-colors hover:border-gold-400 hover:text-gold-400"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================= MARQUEE ========================= */}
      <section className="border-y border-white/10 bg-navy-950 py-5">
        <Marquee durationSeconds={38}>
          {[
            "PLAY HARD.",
            "NETWORK HARDER.",
            "ONE AUCTION.",
            `${teamCount} TEAMS.`,
            "WHERE CORPORATE CRICKET BEGINS.",
          ].map((t) => (
            <span key={t} className="inline-flex items-center">
              <span className="display-wordmark px-5 text-2xl text-white/90 sm:text-3xl">
                {t}
              </span>
              <BallGlyph className="text-gold-400" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* ========================= ABOUT ========================= */}
      <section id="about" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal className="flex flex-col gap-6">
            <Eyebrow variant="script" className="text-gold-600">Corporate cricket, done right</Eyebrow>
            <h2 className="editorial-heading max-w-3xl text-4xl text-ink-900 sm:text-5xl">
              We&apos;re bringing working professionals together—across companies,
              roles and playing styles.
            </h2>
          </Reveal>

          {leagueConfig.companies.length > 0 && (
            <Reveal className="mt-8 flex flex-wrap gap-2">
              {leagueConfig.companies.map((c) => (
                <Chip key={c} className="border-navy-900/15 text-navy-900">
                  {c}
                </Chip>
              ))}
            </Reveal>
          )}

          <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-navy-900/10 pt-8 sm:flex-row sm:items-center">
            <span className="eyebrow text-muted-ink">
              One league. Every industry. Pure competition.
            </span>
            {registeredCount >= 50 && (
              <AvatarStack count={registeredCount} label="players in the pool" />
            )}
            <span className="eyebrow text-muted-ink">/ {site.season} · 2027</span>
          </div>
        </div>
      </section>

      {/* ========================= FOUNDERS ========================= */}
      <FoundersSection />

      {/* ========================= FORMAT ========================= */}
      <section id="format" className="scroll-mt-24 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="lg:max-w-sm">
              <Eyebrow variant="script" className="text-gold-400">
                How it works
              </Eyebrow>
              <h2 className="editorial-heading mt-5 text-4xl sm:text-5xl">
                From registration to the final over.
              </h2>
              {statItems.length > 0 && (
                <div
                  className={`mt-10 grid gap-4 ${
                    statItems.length === 1
                      ? "grid-cols-1"
                      : statItems.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  }`}
                >
                  {statItems.map((s) => (
                    <StatCounter key={s.label} value={s.value} label={s.label} />
                  ))}
                </div>
              )}
              {open && (
                <RollButton href="/register" variant="gold" className="mt-8">
                  Register Now
                </RollButton>
              )}
            </div>

            <div className="flex-1 lg:max-w-xl">
              <Accordion
                tone="dark"
                items={[
                  {
                    id: "register",
                    title: "Register",
                    tag: "01",
                    chips: ["Public form", ageRuleChip(settings), "Share CricHeroes"],
                    body: "Fill the registration form, pay the fee, and submit your CricHeroes profile. No account needed.",
                  },
                  {
                    id: "categorise",
                    title: "Get categorised",
                    tag: "02",
                    chips: ["Marquee", "Category A", "Category B"],
                    body: "Our selectors assess your profile and assign a category ahead of the auction.",
                  },
                  {
                    id: "auction",
                    title: "Player auction",
                    tag: "03",
                    chips: ["Live", "Owners bid", "Mock purse"],
                    body: "All franchises bid to draft players into their squads on auction day.",
                  },
                  {
                    id: "league",
                    title: "League stage",
                    tag: "04",
                    chips: ["T20", "Two groups", "Points table"],
                    body: "Teams face off through the group stage, climbing the points table.",
                  },
                  {
                    id: "playoffs",
                    title: "Playoffs",
                    tag: "05",
                    chips: ["Knockouts", "Final"],
                    body: "The top teams fight through the knockouts to the final for the trophy.",
                  },
                ]}
              />
            </div>
          </div>

          {auctionFmt && (
            <Reveal className="mt-14">
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src="/images/format.webp"
                  alt="A cricket ground at dusk"
                  width={1200}
                  height={420}
                  sizes="(min-width:1024px) 60rem, 100vw"
                  className="h-56 w-full object-cover sm:h-72"
                />
                <GlassCaption className="absolute bottom-4 left-4">
                  <span className="eyebrow text-white/70">Auction Day</span>
                  <p className="font-display text-lg font-semibold">
                    {auctionFmt.day} · {auctionFmt.time}
                  </p>
                </GlassCaption>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ========================= KEY DATES ========================= */}
      {dates.length > 0 && (
      <section id="dates" className="scroll-mt-24 bg-cream-100">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Eyebrow variant="script" className="text-gold-600">
            Mark your calendar
          </Eyebrow>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <DisplayWordmark className="text-[clamp(3rem,10vw,7rem)] text-navy-900">
              SEASON 01
            </DisplayWordmark>
            <p className="max-w-sm text-muted-ink">
              There&apos;s always a match coming up. Here&apos;s what&apos;s next on the
              road to the trophy.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {dates.map((d) => {
                const f = fmtDateTime(d.iso);
                return (
                  <div
                    key={d.key}
                    className="flex items-center gap-4 rounded-2xl border border-navy-900/10 bg-white p-4"
                  >
                    <DateTile date={d.iso!} />
                    <div className="flex flex-1 flex-col">
                      <span className="eyebrow text-muted-ink">{d.label}</span>
                      <span className="font-display text-base font-semibold text-navy-900">
                        {f?.day}
                      </span>
                      <span className="text-sm text-muted-ink">{f?.time} IST</span>
                    </div>
                    <a
                      href={icsHref(d.label, d.iso!)}
                      aria-label={`Add ${d.label} to calendar`}
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-navy-900/15 text-navy-700 transition-colors hover:border-gold-400 hover:text-gold-600"
                    >
                      <CalendarPlus className="size-4" />
                    </a>
                  </div>
                );
              })}
          </div>
        </div>
      </section>
      )}

      {/* ========================= PICK YOUR ROLE ========================= */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-y-0 left-0 hidden w-1/2 lg:block">
          <Image
            src="/images/dates.webp"
            alt=""
            fill
            sizes="50vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/40 to-navy-950" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:py-28 lg:grid-cols-2">
          <div className="lg:col-start-2">
            <Eyebrow variant="script" className="text-gold-400">
              Choose your role
            </Eyebrow>
            <h2 className="editorial-heading mt-5 text-4xl sm:text-5xl">
              Every team needs eleven. Where do you fit?
            </h2>
            <div className="mt-8">
              <Accordion
                tone="dark"
                items={[
                  { id: "bat", title: "Batter", body: "Anchor the innings or go big up top." },
                  { id: "bowl", title: "Bowler", body: "Pace or spin — strike with the new ball or at the death." },
                  { id: "ar", title: "All-Rounder", body: "Do it all: contribute with bat and ball." },
                  { id: "wk", title: "Wicket-Keeper", body: "Marshal the field and finish the chase." },
                ]}
              />
            </div>
            <p className="mt-6 text-sm text-white/60">
              Not sure? Register and our selectors will assess your CricHeroes
              profile.
            </p>
            {open && (
              <RollButton href="/register" variant="gold" className="mt-6">
                Register Now
              </RollButton>
            )}

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Pro-standard ground", d: "Play under lights on a proper pitch.", href: "/ballpark" },
                { t: "Live auction", d: "Get drafted like a pro, for real." },
                { t: "Network that matters", d: "Meet professionals across industries." },
              ].map((b, i) => {
                const cardClass =
                  "group rounded-2xl border border-white/12 bg-white/5 p-4 transition-colors";
                const content = (
                  <>
                    <span className="eyebrow text-gold-400">{i + 1}/3</span>
                    <p className="mt-2 flex items-center gap-1 font-display text-base font-semibold">
                      {b.t}
                      {b.href && (
                        <ArrowUpRight className="size-4 text-gold-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </p>
                    <p className="mt-1 text-sm text-white/60">{b.d}</p>
                  </>
                );
                return b.href ? (
                  <Link key={b.t} href={b.href} className={`${cardClass} hover:border-gold-400/50`}>
                    {content}
                  </Link>
                ) : (
                  <div key={b.t} className={cardClass}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= TEAMS ========================= */}
      <section id="teams" className="scroll-mt-24 bg-cream-100">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <Eyebrow variant="script" className="text-gold-600">
                The franchises
              </Eyebrow>
              <h2 className="editorial-heading mt-5 text-4xl text-navy-900 sm:text-5xl">
                {teamCount} franchises. One trophy.
              </h2>
            </div>
            <Link
              href="/franchises"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-gold-600"
            >
              View all teams <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <TeamRevealCard featured />
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <TeamRevealCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= SPONSORS ========================= */}
      {sponsors.length > 0 && (
        <section className="border-y border-navy-900/10 bg-white py-12">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-6 flex items-center justify-between">
              <Eyebrow variant="script" className="text-gold-600">Our partners</Eyebrow>
              <Link
                href="/sponsors"
                className="text-sm font-medium text-navy-700 hover:text-gold-600"
              >
                Become a sponsor
              </Link>
            </div>
          </div>
          <Marquee durationSeconds={30}>
            {sponsors
              .filter((s) => s.logo_url)
              .map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.id}
                  src={s.logo_url!}
                  alt={s.name}
                  className="mx-10 h-10 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              ))}
          </Marquee>
        </section>
      )}

      {/* ========================= FAQ ========================= */}
      {faqItems.length > 0 && (
        <section id="faq" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
            <Eyebrow variant="script" className="text-gold-600">
              Good to know
            </Eyebrow>
            <h2 className="editorial-heading mt-5 mb-10 text-4xl text-ink-900 sm:text-5xl">
              Questions, answered.
            </h2>
            <Accordion tone="light" items={faqItems} />
          </div>
        </section>
      )}

      {/* ========================= FINAL CTA ========================= */}
      <section className="bg-gold-400">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="editorial-heading max-w-xl text-4xl text-navy-950 sm:text-5xl">
            Your company. Your colours. Your season.
          </h2>
          <RollButton href="/register" variant="navy" className="shrink-0">
            {open ? "Register Now" : "View Teams"}
          </RollButton>
        </div>
      </section>
    </>
  );
}

/** Placeholder franchise card shown until real crests are added. */
function TeamRevealCard({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`group relative flex items-end overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-900 ${
        featured ? "min-h-[20rem] md:row-span-2" : "min-h-[9.5rem]"
      }`}
    >
      <div className="absolute inset-0 grid place-items-center opacity-20">
        <BallGlyph className="text-6xl text-gold-400" />
      </div>
      <GlassCaption className="m-3 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow text-white/60">Franchise</span>
            <p className="font-display text-lg font-semibold">Team reveal soon</p>
          </div>
          <span className="grid size-8 place-items-center rounded-full border border-white/25 text-gold-400">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </GlassCaption>
    </div>
  );
}
