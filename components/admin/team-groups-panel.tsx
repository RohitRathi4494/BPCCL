"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import {
  setFranchiseGroup,
  type FixtureState,
} from "@/app/admin/(protected)/fixtures/actions";
import { POOL_LABELS } from "@/lib/pools/shared";

export type GroupTeam = {
  id: string;
  name: string;
  short_code: string | null;
  pool: string | null;
};

const fieldClass =
  "rounded-sm border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function TeamRow({ t }: { t: GroupTeam }) {
  const [state, action, pending] = useActionState<FixtureState, FormData>(
    setFranchiseGroup,
    {},
  );
  const [pool, setPool] = useState(t.pool ?? "");

  function change(value: string) {
    setPool(value);
    const fd = new FormData();
    fd.set("franchise_id", t.id);
    fd.set("pool", value);
    action(fd);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/30 px-3 py-2">
      <span className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
        {t.name}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {pending ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : state.ok ? (
          <Check className="size-3.5 text-accent" />
        ) : state.error ? (
          <span className="text-[10px] text-[var(--closed)]">!</span>
        ) : null}
        <select
          value={pool}
          onChange={(e) => change(e.target.value)}
          className={fieldClass}
        >
          <option value="">— Unassigned</option>
          <option value="A">{POOL_LABELS.A} (A)</option>
          <option value="B">{POOL_LABELS.B} (B)</option>
        </select>
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
        Assign each team to a group. This drives the points table (every team
        shows in its group) and auto-fills a fixture&apos;s group when you pick
        two teams from the same group.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <TeamRow key={`${t.id}-${t.pool ?? ""}`} t={t} />
        ))}
      </div>
    </div>
  );
}
