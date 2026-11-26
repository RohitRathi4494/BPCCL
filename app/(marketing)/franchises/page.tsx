import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { getPublicFranchises } from "@/lib/queries/franchises";
import { getLeagueSettings } from "@/lib/queries/settings";
import { FRANCHISE_META, initialsOf, type FranchiseMeta } from "@/lib/franchises";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Franchises",
  description: `Meet the franchises of ${site.name} ${site.season} — the teams battling it out at ${site.venue.full}.`,
};

const GOLD = "#f4b324";

/** Merge a DB franchise with its curated presentation metadata. */
function metaFor(shortCode: string | null): FranchiseMeta | null {
  if (!shortCode) return null;
  return FRANCHISE_META[shortCode.toUpperCase()] ?? null;
}

export default async function FranchisesPage() {
  const [franchises, settings] = await Promise.all([
    getPublicFranchises(),
    getLeagueSettings(),
  ]);
  const count = settings?.franchise_count ?? franchises.length;

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="theme-navy bg-navy-950 border-b border-border">
        <div className="mx-auto max-w-6xl px-5 pt-28 pb-12 sm:pt-36">
          <span className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
            The League · {site.season}
          </span>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-6xl">
            Meet the <span className="text-glow-gold text-accent">Franchises</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/85">
            {count} teams. One title. Every franchise builds its squad at the
            live auction, then battles it out at {site.venue.full}. Here&apos;s
            the line-up.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Stat value={String(count)} label="Franchises" />
            <span className="hidden h-8 w-px bg-border sm:block" />
            <Stat value="1" label="Champion" />
            <span className="hidden h-8 w-px bg-border sm:block" />
            <Stat value="Mock" label="Auction Purse" />
          </div>
        </div>
      </section>

      {/* ---- Franchise grid ---- */}
      <section className="theme-navy bg-navy-950">
        <div className="mx-auto max-w-6xl px-5 py-16">
          {franchises.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              The franchise line-up will be announced soon.
            </p>
          ) : (
            <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {franchises.map((f) => {
                const meta = metaFor(f.short_code);
                const accent = meta?.accent ?? GOLD;
                const tagline = meta?.tagline;
                const initials = f.short_code || initialsOf(f.name);
                return (
                  <article
                    key={f.id}
                    style={{ "--team": accent } as React.CSSProperties}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[var(--team)]/60 hover:shadow-[0_22px_60px_-18px_var(--team)]"
                  >
                    {/* top accent hairline */}
                    <span className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[var(--team)] to-transparent opacity-70" />

                    {/* crest plinth */}
                    <div className="relative flex h-48 items-center justify-center overflow-hidden">
                      {/* team-colour radial wash */}
                      <div
                        aria-hidden
                        className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--team) 30%, transparent) 0%, transparent 62%)`,
                        }}
                      />
                      {/* oversized monogram watermark */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute font-heading text-[7rem] leading-none font-black tracking-tighter text-white/[0.05] select-none"
                      >
                        {initials}
                      </span>

                      {/* crest */}
                      {meta?.logo ? (
                        <div className="relative z-10 size-32 transition-transform duration-500 group-hover:scale-[1.06]">
                          <Image
                            src={meta.logo}
                            alt={`${f.name} crest`}
                            fill
                            sizes="128px"
                            className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                          />
                        </div>
                      ) : (
                        <span
                          className="relative z-10 grid size-24 place-items-center rounded-full border font-heading text-2xl font-black tracking-wide text-foreground uppercase"
                          style={{
                            borderColor: `color-mix(in srgb, var(--team) 50%, transparent)`,
                            background: `color-mix(in srgb, var(--team) 12%, transparent)`,
                          }}
                        >
                          {initials}
                        </span>
                      )}
                    </div>

                    {/* info */}
                    <div className="relative border-t border-border/70 p-5">
                      <h2 className="font-heading text-xl font-bold tracking-tight text-foreground uppercase">
                        {f.name}
                      </h2>
                      {tagline && (
                        <p className="mt-1 text-sm text-muted-foreground italic">
                          &ldquo;{tagline}&rdquo;
                        </p>
                      )}
                      {f.owners.length > 0 && (
                        <div className="mt-3 border-t border-border/60 pt-3">
                          <p className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground/60 uppercase">
                            {f.owners.length > 1 ? "Owners" : "Owner"}
                          </p>
                          <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                            {f.owners.map((owner, i) => (
                              <li
                                key={`${owner}-${i}`}
                                className="text-xs font-medium text-foreground/90"
                              >
                                {owner}
                                {i < f.owners.length - 1 && (
                                  <span className="ml-2 text-muted-foreground/40">
                                    ·
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Published squad (no prices) */}
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <p className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground/60 uppercase">
                          Squad{" "}
                          <span className="text-foreground/70">
                            {f.squad.length}
                          </span>
                        </p>
                        {f.squad.length === 0 ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            To be announced.
                          </p>
                        ) : (
                          <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto pr-1">
                            {f.squad.map((p, i) => (
                              <li
                                key={`${p.name}-${i}`}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="truncate text-foreground/90">
                                  {p.name}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                                  {p.type === "auction"
                                    ? (p.category ?? "—")
                                    : p.type}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </Reveal>
          )}
        </div>
      </section>

      {/* ---- Closing CTA ---- */}
      <section className="bg-cream-100 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase sm:text-3xl">
              The squads are locked in
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              The auction is complete. Next up: the season at {site.venue.full}.
              Want your brand on it?
            </p>
          </div>
          <Link
            href="/sponsors"
            className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-6 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)]"
          >
            Become a Sponsor <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
        {value}
      </span>
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
