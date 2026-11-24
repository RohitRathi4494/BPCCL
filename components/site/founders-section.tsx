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
    <article className="group relative flex flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_26px_60px_-34px_rgba(11,31,75,0.55)] ring-1 ring-navy-900/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_44px_84px_-32px_rgba(11,31,75,0.5)]">
      {/* Portrait — natural photo, no overlay */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-navy-950">
        {founder.photo ? (
          <Image
            src={founder.photo}
            alt={`${founder.name} — ${founder.role}`}
            fill
            sizes="(min-width:1024px) 22rem, (min-width:640px) 45vw, 90vw"
            className="object-cover object-top transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <BallGlyph className="absolute text-[10rem] text-gold-400/10" />
            <span className="display-wordmark text-6xl text-white/80">
              {initials(founder.name)}
            </span>
          </div>
        )}
      </div>

      {/* Card body — cursive signature name, gold flourish, role, then bio */}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <span className="font-script text-[2.6rem] leading-none text-navy-900">
          {founder.name}
        </span>
        <span aria-hidden className="mt-2 flex items-center gap-2">
          <span className="h-px w-12 bg-gradient-to-r from-gold-400 to-transparent" />
          <BallGlyph className="text-[0.65rem] text-gold-400" />
        </span>
        <span className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-gold-600">
          {founder.role}
        </span>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-ink">
          {founder.message}
        </p>
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
      className="relative scroll-mt-24 overflow-hidden border-y border-navy-900/10 bg-cream-100"
    >
      {/* Soft warm glow top-centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal className="flex flex-col gap-6">
          <Eyebrow variant="script" className="text-gold-600">
            The people behind it
          </Eyebrow>
          <h2 className="editorial-heading max-w-3xl text-4xl text-navy-900 sm:text-5xl">
            Built by players,{" "}
            <span className="bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 bg-clip-text text-transparent">
              for players.
            </span>
          </h2>
          {vision && (
            <p className="max-w-2xl text-lg leading-relaxed text-muted-ink">
              {vision}
            </p>
          )}
        </Reveal>

        {/* "— Founders" rule label */}
        <Reveal className="mt-12 flex items-center gap-3">
          <span className="h-px w-10 bg-gold-600" />
          <span className="eyebrow text-gold-600">Founders</span>
        </Reveal>

        <Reveal className={`mt-6 grid grid-cols-1 gap-7 ${grid}`}>
          {founders.map((f) => (
            <FounderCard key={f.name} founder={f} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
