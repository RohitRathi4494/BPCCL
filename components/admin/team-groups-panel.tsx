"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import {
  setFranchiseGroup,
  setFranchiseNrr,
  type FixtureState,
} from "@/app/admin/(protected)/fixtures/actions";
import { POOL_LABELS } from "@/lib/pools/shared";

export type GroupTeam = {
  id: string;
  name: string;
  short_code: string | null;
  pool: string | null;
  nrr: number | null;
};

const fieldClass =
  "rounded-sm border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function StatusDot({ state, pending }: { state: FixtureState; pending: boolean }) {
  if (pending)
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
  if (state.ok) return <Check className="size-3.5 text-accent" />;
  if (state.error) return <span className="text-[10px] text-[var(--closed)]">!</span>;
  return null;
}

function TeamRow({ t }: { t: GroupTeam }) {
  const [gState, gAction, gPending] = useActionState<FixtureState, FormData>(
    setFranchiseGroup,
    {},
  );
  const [nState, nAction, nPending] = useActionState<FixtureState, FormData>(
    setFranchiseNrr,
    {},
  );
  const [pool, setPool] = useState(t.pool ?? "");

  function changeGroup(value: string) {
    setPool(value);
    const fd = new FormData();
    fd.set("franchise_id", t.id);
    fd.set("pool", value);
    gAction(fd);
  }

  function saveNrr(value: string) {
    const fd = new FormData();
    fd.set("franchise_id", t.id);
    fd.set("nrr", value.trim());
    nAction(fd);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/30 px-3 py-2">
      <span className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
        {t.name}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <StatusDot state={gState} pending={gPending} />
        <select
          value={pool}
          onChange={(e) => changeGroup(e.target.value)}
          className={fieldClass}
          title="Group"
        >
          <option value="">— Unassigned</option>
          <option value="A">{POOL_LABELS.A} (A)</option>
          <option value="B">{POOL_LABELS.B} (B)</option>
        </select>

        <StatusDot state={nState} pending={nPending} />
        <input
          type="number"
          step="0.001"
          defaultValue={t.nrr ?? ""}
          placeholder="NRR"
          title="Net Run Rate (manual, e.g. 1.25 or -0.48)"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (t.nrr != null ? String(t.nrr) : "")) saveNrr(v);
          }}
          className={`${fieldClass} w-20`}
        />
      </div>
    </div>
  );
}

export function TeamGroupsPanel({ teams }: { teams: GroupTeam[] }) {
  const countA = teams.filter((t) => t.pool === "A").length;
  const countB = teams.filter((t) => t.pool === "B").length;
  const countU = teams.filter((t) => t.pool !== "A" && t.pool !== "B").length;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground uppercase">
          <Users className="size-4 text-primary" /> Team Groups
        </h2>
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          {POOL_LABELS.A} {countA} · {POOL_LABELS.B} {countB}
          {countU > 0 ? ` · Unassigned ${countU}` : ""}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Assign each team to a group and enter its{" "}
        <span className="text-foreground/80">NRR</span> (net run rate, e.g.{" "}
        <span className="font-mono">1.25</span> or{" "}
        <span className="font-mono">-0.48</span>). Groups drive the points table
        and auto-fill a fixture&apos;s group; NRR shows in the table and breaks
        ties. Both save automatically.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <TeamRow key={`${t.id}-${t.pool ?? ""}`} t={t} />
        ))}
      </div>
    </div>
  );
}
