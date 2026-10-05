"use client";

import { useActionState, useState } from "react";
import { setSquadOrder, type OrderState } from "@/app/admin/(protected)/squads/actions";

const initial: OrderState = {};

/**
 * Inline editor for a squad member's manual display sequence. Saves on blur or
 * Enter (only when the value actually changed). Lower numbers sort first; blank
 * clears the override. Shows a ✓ while the saved value is still in the box.
 */
export function SquadOrderInput({
  playerId,
  value,
}: {
  playerId: string;
  value: number | null;
}) {
  const [state, formAction, pending] = useActionState(setSquadOrder, initial);
  const original = value?.toString() ?? "";

  const [text, setText] = useState(original);
  // Re-sync the field when the server value changes (e.g. after revalidate),
  // using the sanctioned "store info from previous render" pattern.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setText(original);
  }

  const submit = (form: HTMLFormElement) => {
    if (text.trim() === original) return; // nothing changed
    form.requestSubmit();
  };

  const inSync = text.trim() === original;

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="player_id" value={playerId} />
      <input
        type="number"
        name="display_order"
        value={text}
        min={0}
        max={999}
        disabled={pending}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => submit(e.currentTarget.form!)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(e.currentTarget.form!);
          }
        }}
        placeholder="—"
        aria-label="Display sequence"
        className="w-14 rounded border border-border bg-background px-2 py-1 text-center font-mono text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
      />
      {pending ? (
        <span className="text-[10px] text-muted-foreground">…</span>
      ) : state.error ? (
        <span className="text-[10px] text-destructive" title={state.error}>
          !
        </span>
      ) : state.saved && inSync ? (
        <span className="text-[11px] text-primary">✓</span>
      ) : null}
    </form>
  );
}
