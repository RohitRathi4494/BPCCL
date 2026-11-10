"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Plus, Trash2, Pencil, Trophy } from "lucide-react";
import {
  createMatch,
  updateMatch,
  setResult,
  deleteMatch,
  type FixtureState,
} from "@/app/admin/(protected)/fixtures/actions";
import {
  MATCH_STAGES,
  MATCH_STATUSES,
  poolLabel,
  resultText,
  fmtDate,
  fmtDay,
  fmtTime,
  istDateInput,
  istTimeInput,
  type Fixture,
} from "@/lib/fixtures";

type Team = {
  id: string;
  name: string;
  short_code: string | null;
  pool?: string | null;
};

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase";

function StateMsg({ state }: { state: FixtureState }) {
  if (state.error)
    return <span className="text-xs text-[var(--closed)]">{state.error}</span>;
  if (state.ok)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent">
        <Check className="size-3.5" /> Saved
      </span>
    );
  return null;
}

/** Shared fixture fields (teams / group / schedule). `f` pre-fills for edit. */
function FixtureFields({ teams, f }: { teams: Team[]; f?: Fixture }) {
  const poolOf = (id: string) =>
    teams.find((t) => t.id === id)?.pool ?? null;

  const [teamA, setTeamA] = useState(f?.teamA.id ?? "");
  const [teamB, setTeamB] = useState(f?.teamB.id ?? "");
  const [pool, setPool] = useState<string>(f?.pool ?? "");

  // Auto-fill the group when both teams share one (admin can still override).
  function onTeam(which: "A" | "B", id: string) {
    const a = which === "A" ? id : teamA;
    const b = which === "B" ? id : teamB;
    if (which === "A") setTeamA(id);
    else setTeamB(id);
    const pa = poolOf(a);
    const pb = poolOf(b);
    if (a && b && pa && pa === pb) setPool(pa);
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Team A</span>
          <select
            name="franchise_a_id"
            value={teamA}
            onChange={(e) => onTeam("A", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Team B</span>
          <select
            name="franchise_b_id"
            value={teamB}
            onChange={(e) => onTeam("B", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Group</span>
          <select
            name="pool"
            value={pool}
            onChange={(e) => setPool(e.target.value)}
            className={fieldClass}
          >
            <option value="">— (knockout)</option>
            <option value="A">Boundary (Group A)</option>
            <option value="B">Wicket (Group B)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Round / Stage</span>
          <select
            name="stage"
            defaultValue={f?.stage ?? "League"}
            className={fieldClass}
          >
            {MATCH_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Match No.</span>
          <input
            name="match_number"
            type="number"
            min={0}
            defaultValue={f?.match_number ?? ""}
            placeholder="e.g. 1"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Date</span>
          <input
            name="date"
            type="date"
            defaultValue={f ? istDateInput(f.scheduled_at) : ""}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Time (IST)</span>
          <input
            name="time"
            type="time"
            defaultValue={f ? istTimeInput(f.scheduled_at) : ""}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Venue</span>
          <input
            name="ground"
            defaultValue={f?.ground ?? "Champions Den, Bandhwari"}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex max-w-[200px] flex-col gap-1">
        <span className={labelClass}>Status</span>
        <select
          name="status"
          defaultValue={f?.status ?? "scheduled"}
          className={fieldClass}
        >
          {MATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function AddFixture({ teams }: { teams: Team[] }) {
  const [state, action, pending] = useActionState<FixtureState, FormData>(
    createMatch,
    {},
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 font-heading text-sm font-bold tracking-wide text-primary uppercase"
      >
        <Plus className="size-4" /> Add fixture
      </button>

      {open && (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <FixtureFields teams={teams} />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Save fixture
            </button>
            <StateMsg state={state} />
          </div>
        </form>
      )}
    </div>
  );
}

function PoolBadge({ pool }: { pool: "A" | "B" | null }) {
  const label = poolLabel(pool);
  if (!label) return null;
  return (
    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-primary uppercase">
      {label}
    </span>
  );
}

function ResultForm({ f }: { f: Fixture }) {
  const [state, action, pending] = useActionState<FixtureState, FormData>(
    setResult,
    {},
  );
  const [outcome, setOutcome] = useState<string>(
    f.status === "abandoned"
      ? "abandoned"
      : f.status === "completed"
        ? f.winner_id === f.teamA.id
          ? "A"
          : f.winner_id === f.teamB.id
            ? "B"
            : "tie"
        : "",
  );
  const needsMargin = outcome === "A" || outcome === "B";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="match_id" value={f.id} />
      <input type="hidden" name="franchise_a_id" value={f.teamA.id} />
      <input type="hidden" name="franchise_b_id" value={f.teamB.id} />

      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-accent" />
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          Result
        </span>
      </div>

      <label className="flex max-w-[260px] flex-col gap-1">
        <span className={labelClass}>Outcome</span>
        <select
          name="outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className={fieldClass}
        >
          <option value="">Select…</option>
          <option value="A">{f.teamA.name} won</option>
          <option value="B">{f.teamB.name} won</option>
          <option value="tie">Tie</option>
          <option value="abandoned">Abandoned / No result</option>
          <option value="clear">Clear (back to scheduled)</option>
        </select>
      </label>

      {needsMargin && (
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Won by</span>
            <input
              name="result_margin"
              type="number"
              min={1}
              defaultValue={f.result_margin ?? ""}
              placeholder="e.g. 24"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Runs / Wickets</span>
            <select
              name="result_type"
              defaultValue={f.result_type ?? "runs"}
              className={fieldClass}
            >
              <option value="runs">Runs</option>
              <option value="wickets">Wickets</option>
            </select>
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Note (optional)</span>
        <input
          name="result_note"
          defaultValue={f.result_note ?? ""}
          placeholder="e.g. Super Over, DLS, Player of the Match…"
          className={fieldClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !outcome}
          className="inline-flex items-center gap-2 rounded-sm border border-accent/50 px-4 py-2 font-heading text-xs font-bold tracking-wide text-accent uppercase transition-colors hover:bg-accent/10 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save result
        </button>
        <StateMsg state={state} />
      </div>
    </form>
  );
}

function FixtureCard({ f, teams }: { f: Fixture; teams: Team[] }) {
  const [editState, editAction, editing] = useActionState<
    FixtureState,
    FormData
  >(updateMatch, {});
  const [delState, delAction, deleting] = useActionState<FixtureState, FormData>(
    deleteMatch,
    {},
  );
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const result = resultText(f);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {f.match_number != null && (
            <span className="font-mono text-[11px] text-muted-foreground">
              #{f.match_number}
            </span>
          )}
          <PoolBadge pool={f.pool} />
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            {f.stage}
          </span>
          <span
            className={
              "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase " +
              (f.status === "completed"
                ? "border-accent/40 bg-accent/10 text-accent"
                : f.status === "live"
                  ? "border-[var(--closed)]/50 bg-[var(--closed)]/10 text-[var(--closed)]"
                  : "border-border text-muted-foreground")
            }
          >
            {f.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEdit((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-primary hover:text-primary"
          >
            <Pencil className="size-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Teams + schedule */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-lg font-bold tracking-tight text-foreground">
          {f.teamA.name} <span className="text-muted-foreground">vs</span>{" "}
          {f.teamB.name}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {fmtDay(f.scheduled_at)}, {fmtDate(f.scheduled_at)} · {fmtTime(f.scheduled_at)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{f.ground}</p>
      {result && (
        <p className="text-sm font-medium text-accent">{result}</p>
      )}

      {/* Result entry */}
      <div className="rounded-md border border-border/70 bg-background/30 p-3">
        <ResultForm f={f} />
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div className="rounded-md border border-border/70 bg-background/30 p-3">
          <form action={editAction} className="flex flex-col gap-3">
            <input type="hidden" name="match_id" value={f.id} />
            <FixtureFields teams={teams} f={f} />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={editing}
                className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {editing && <Loader2 className="size-3.5 animate-spin" />}
                Save changes
              </button>
              <StateMsg state={editState} />

              <span className="ml-auto">
                {confirmDel ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-[var(--closed)]">Delete?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("match_id", f.id);
                        delAction(fd);
                      }}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--closed)] px-3 py-1.5 font-heading text-xs font-bold tracking-wide text-white uppercase disabled:opacity-60"
                    >
                      {deleting && <Loader2 className="size-3.5 animate-spin" />}
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)]"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                )}
              </span>
            </div>
            <StateMsg state={delState} />
          </form>
        </div>
      )}
    </div>
  );
}

export function FixturesManager({
  fixtures,
  teams,
}: {
  fixtures: Fixture[];
  teams: Team[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <AddFixture teams={teams} />

      {fixtures.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No fixtures yet. Add the first match above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            {fixtures.length} fixture{fixtures.length === 1 ? "" : "s"}
          </p>
          {fixtures.map((f) => (
            <FixtureCard key={f.id} f={f} teams={teams} />
          ))}
        </div>
      )}
    </div>
  );
}
