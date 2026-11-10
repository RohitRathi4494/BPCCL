import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/site/reveal";
import { getFixtures, getFranchiseGroups } from "@/lib/queries/matches";
import {
  computeStandings,
  groupByDay,
  poolLabel,
  resultText,
  fmtDate,
  fmtDay,
  fmtTime,
  type Fixture,
  type FixtureTeam,
  type Standing,
} from "@/lib/fixtures";
import { POOL_LABELS } from "@/lib/pools/shared";
import { FRANCHISE_META, initialsOf } from "@/lib/franchises";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fixtures & Points Table",
  description: `The full ${site.name} ${site.season} schedule and points table — every match, group, venue and result at ${site.venue.full}.`,
};

function logoFor(shortCode: string | null): string | null {
  if (!shortCode) return null;
  return FRANCHISE_META[shortCode.toUpperCase()]?.logo ?? null;
}

function Crest({
  team,
  size = 44,
}: {
  team: FixtureTeam;
  size?: number;
}) {
  const logo = logoFor(team.short_code);
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background"
      style={{ width: size, height: size }}
    >
      {logo ? (
        <Image
          src={logo}
          alt={team.name}
          fill
          sizes={`${size}px`}
          className="object-contain p-1"
        />
      ) : (
        <span className="font-heading text-xs font-bold text-muted-foreground">
          {initialsOf(team.name)}
        </span>
      )}
    </span>
  );
}

function TeamRow({
  team,
  isWinner,
}: {
  team: FixtureTeam;
  isWinner: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Crest team={team} />
      <span
        className={
          "font-heading text-base font-bold tracking-tight " +
          (isWinner ? "text-accent" : "text-foreground")
        }
      >
        {team.name}
      </span>
    </div>
  );
}

function FixtureCard({ f }: { f: Fixture }) {
  const group = poolLabel(f.pool);
  const result = resultText(f);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {f.match_number != null && (
          <span className="font-mono text-[11px] text-muted-foreground">
            Match {f.match_number}
          </span>
        )}
        {group && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-primary uppercase">
            {group}
          </span>
        )}
        {f.stage && f.stage !== "League" && (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-accent uppercase">
            {f.stage}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <TeamRow team={f.teamA} isWinner={f.winner_id === f.teamA.id} />
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
            vs
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <TeamRow team={f.teamB} isWinner={f.winner_id === f.teamB.id} />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-[11px] text-muted-foreground">
          {fmtTime(f.scheduled_at)} · {f.ground}
        </p>
        {result ? (
          <p className="mt-1 text-sm font-medium text-accent">{result}</p>
        ) : f.status === "live" ? (
          <p className="mt-1 text-sm font-medium text-[var(--closed)]">
            ● Live now
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StandingsTable({
  title,
  rows,
}: {
  title: string;
  rows: Standing[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-background/40 px-4 py-3">
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground uppercase">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-2 py-2.5 font-medium">Team</th>
              <th className="px-2 py-2.5 text-center font-medium">P</th>
              <th className="px-2 py-2.5 text-center font-medium">W</th>
              <th className="px-2 py-2.5 text-center font-medium">L</th>
              <th className="px-2 py-2.5 text-center font-medium">T/NR</th>
              <th className="px-4 py-2.5 text-center font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={s.franchiseId}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Crest
                      team={{
                        id: s.franchiseId,
                        name: s.name,
                        short_code: s.short_code,
                      }}
                      size={28}
                    />
                    <span className="font-heading font-bold tracking-tight text-foreground">
                      {s.name}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-foreground/85">
                  {s.played}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-foreground/85">
                  {s.won}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-foreground/85">
                  {s.lost}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-foreground/85">
                  {s.tied}
                </td>
                <td className="px-4 py-2.5 text-center font-heading text-base font-bold tabular-nums text-accent">
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function FixturesPage() {
  const [fixtures, groups] = await Promise.all([
    getFixtures(),
    getFranchiseGroups(),
  ]);
  const days = groupByDay(fixtures);
  const standingsA = computeStandings(fixtures, groups.A);
  const standingsB = computeStandings(fixtures, groups.B);
  const hasStandings = standingsA.length > 0 || standingsB.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="lamp-glow border-b border-border">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-12">
          <span className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
            The Season · {site.season}
          </span>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-6xl">
            Fixtures &amp;{" "}
            <span className="text-glow-gold text-accent">Points Table</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/85">
            Every match of {site.name} {site.season} — the groups, the venue,
            the dates, and the results as they come in at {site.venue.full}.
          </p>
        </div>
      </section>

      {/* Points table */}
      {hasStandings && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
              Points <span className="text-primary">Table</span>
            </h2>
            <hr className="crease-rule mt-3 mb-6 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <StandingsTable title={POOL_LABELS.A} rows={standingsA} />
              <StandingsTable title={POOL_LABELS.B} rows={standingsB} />
            </div>
          </div>
        </section>
      )}

      {/* Schedule */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground uppercase">
            Match <span className="text-primary">Schedule</span>
          </h2>
          <hr className="crease-rule mt-3 mb-8 w-full" />

          {days.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              The fixtures will be announced soon. Check back shortly.
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {days.map((day) => (
                <div key={day.key}>
                  <div className="mb-4 flex items-baseline gap-3">
                    <h3 className="font-heading text-xl font-bold tracking-tight text-foreground uppercase">
                      {fmtDay(day.iso)}
                    </h3>
                    <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                      {fmtDate(day.iso)}
                    </span>
                  </div>
                  <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {day.fixtures.map((f) => (
                      <FixtureCard key={f.id} f={f} />
                    ))}
                  </Reveal>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
