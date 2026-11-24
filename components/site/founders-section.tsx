import Image from "next/image";
import { Reveal } from "@/components/site/reveal";
import { Eyebrow, BallGlyph } from "@/components/site/primitives";
import { leagueConfig, type LeagueFounder } from "@/lib/league.config";

/**
 * Founders section — a short vision statement for the league followed by a
 * grid of premium founder cards (portrait, name, designation + a short
 * message). Rendered on a dark navy field with gold finishing so it stands
 * out from the lighter sections around it.
 *
 * Content is driven entirely by `leagueConfig.vision` / `leagueConfig.founders`
 * (the single brand source of truth). Renders nothing when there are no
 * founders, so it's safe to leave the array empty until real data is in.
 */

/** Centre/size the grid sensibly for 1–4 founders (static Tailwind classes). */
const gridByCount: Record<number, string> = {
  1: "mx-auto max-w-sm",
  2: "mx-auto max-w-3xl sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function FounderCard({ founder }: { founder: LeagueFounder }) {
  return (
    <article className="group relative rounded-[1.75rem] bg-gradient-to-b from-gold-400/50 via-white/10 to-white/[0.04] p-px shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1.5 hover:from-gold-400/80 hover:shadow-[0_34px_70px_-26px_rgba(245,197,66,0.28)]">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-navy-900">
        {/* Portrait */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-navy-950">
          {founder.photo ? (
            <Image
              src={founder.photo}
              alt={`${founder.name} — ${founder.role}`}
              fill
              sizes="(min-width:1024px) 22rem, (min-width:640px) 45vw, 90vw"
              className="object-cover object-top transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <BallGlyph className="absolute text-[9rem] text-gold-400/10" />
              <span className="display-wordmark text-6xl text-white/90">
                {initials(founder.name)}
              </span>
            </div>
          )}
          {/* Scrim so the name plate reads over the photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/25 to-transparent" />

          {/* Gold "Season 1" style corner tag */}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-navy-950/60 px-3 py-1 backdrop-blur">
            <BallGlyph className="text-[0.85em] text-gold-400" />
            <span className="eyebrow text-gold-glow/90">Founding Team</span>
          </span>
        </div>

        {/* Name plate — lifted to overlap the photo's lower scrim */}
        <div className="relative -mt-16 px-6">
          <p className="font-display text-2xl font-bold tracking-tight text-white">
            {founder.name}
          </p>
          <Eyebrow brackets="none" className="mt-1 text-gold-400">
            {founder.role}
          </Eyebrow>
        </div>

        {/* Gold hairline divider */}
        <div className="mx-6 mt-4 h-px bg-gradient-to-r from-gold-400/70 via-gold-400/20 to-transparent" />

        {/* Message */}
        <div className="relative flex flex-1 flex-col p-6 pt-4">
          <span
            aria-hidden
            className="absolute left-4 top-2 font-display text-5xl leading-none text-gold-400/35"
          >
            &ldquo;
          </span>
          <p className="relative pl-6 text-[15px] leading-relaxed text-white/70">
            {founder.message}
          </p>
        </div>
      </div>
    </article>
  );
}

export function FoundersSection() {
  const { vision, founders } = leagueConfig;
  if (founders.length === 0) return null;

  const grid = gridByCount[founders.length] ?? "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      id="founders"
      className="relative scroll-mt-24 overflow-hidden border-y border-gold-400/15 bg-navy-950 text-white"
    >
      {/* Decorative gold glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-[-6rem] h-80 w-80 rounded-full bg-gold-600/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal className="flex flex-col gap-6">
          <Eyebrow brackets="square" className="text-gold-400">
            The people behind it
          </Eyebrow>
          <h2 className="editorial-heading max-w-3xl text-4xl text-white sm:text-5xl">
            Built by players,{" "}
            <span className="bg-gradient-to-r from-gold-glow via-gold-400 to-gold-600 bg-clip-text text-transparent">
              for players.
            </span>
          </h2>
          {vision && (
            <p className="max-w-2xl text-lg leading-relaxed text-white/60">
              {vision}
            </p>
          )}
        </Reveal>

        <Reveal className={`mt-14 grid grid-cols-1 gap-7 ${grid}`}>
          {founders.map((f) => (
            <FounderCard key={f.name} founder={f} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
