"use client";

import { useActionState } from "react";
import { Check, Loader2, KeyRound } from "lucide-react";
import {
  updateFranchise,
  setFranchiseOwnerLogin,
  type FranchiseState,
} from "@/app/admin/(protected)/franchises/actions";
import type { FranchiseRow } from "@/app/admin/(protected)/franchises/page";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase";

export function FranchiseManager({ rows }: { rows: FranchiseRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((f) => (
        <FranchiseCard key={f.id} f={f} />
      ))}
    </div>
  );
}

function StateMsg({ state }: { state: FranchiseState }) {
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

function FranchiseCard({ f }: { f: FranchiseRow }) {
  const [editState, editAction, editing] = useActionState<FranchiseState, FormData>(
    updateFranchise,
    {},
  );
  const [loginState, loginAction, loggingIn] = useActionState<
    FranchiseState,
    FormData
  >(setFranchiseOwnerLogin, {});

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      {/* Purse summary */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Purse ₹{inr(f.purse_remaining)} / ₹{inr(f.purse_total)}
        </span>
        <span
          className={
            "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase " +
            (f.hasOwner
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border text-muted-foreground")
          }
        >
          {f.hasOwner ? "Owner linked" : "No owner"}
        </span>
      </div>

      {/* Edit franchise details */}
      <form action={editAction} className="flex flex-col gap-3">
        <input type="hidden" name="franchise_id" value={f.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Franchise Name</span>
            <input name="name" defaultValue={f.name} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Short Code</span>
            <input
              name="short_code"
              defaultValue={f.short_code ?? ""}
              placeholder="GWR"
              className={fieldClass}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={editing}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {editing && <Loader2 className="size-3.5 animate-spin" />}
            Save details
          </button>
          <StateMsg state={editState} />
        </div>
      </form>

      <hr className="border-border" />

      {/* Owner login */}
      <form action={loginAction} className="flex flex-col gap-3">
        <input type="hidden" name="franchise_id" value={f.id} />
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            Owner Login{" "}
            {f.ownerEmail && (
              <span className="text-foreground/80 normal-case">· {f.ownerEmail}</span>
            )}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={f.ownerEmail ?? ""}
              placeholder="owner@franchise.in"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Password (set / reset)</span>
            <input
              name="password"
              type="text"
              placeholder="min 8 characters"
              className={fieldClass}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loggingIn}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loggingIn && <Loader2 className="size-3.5 animate-spin" />}
            {f.hasOwner ? "Update login" : "Create login"}
          </button>
          <StateMsg state={loginState} />
        </div>
      </form>
    </div>
  );
}
