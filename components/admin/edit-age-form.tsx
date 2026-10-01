"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import {
  editPlayerAge,
  type EditAgeState,
} from "@/app/admin/(protected)/registrations/actions";

/**
 * Inline editor for a player's age. Renders like a `Detail` cell (label + value)
 * but the value is an editable number input. The date of birth is NOT changed —
 * this only overrides `players.age` (some registrants entered a wrong DOB, so the
 * admin corrects the age that drives the age buckets without touching the DOB).
 */
export function EditAgeForm({
  playerId,
  age,
}: {
  playerId: string;
  age: number | null;
}) {
  const [state, formAction, pending] = useActionState<EditAgeState, FormData>(
    editPlayerAge,
    {},
  );

  // After a save, show the just-saved value so the field reflects the update.
  const currentAge = state.saved && state.age != null ? state.age : age;

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="player_id" value={playerId} />
      <label
        htmlFor="player_age"
        className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
      >
        Age
      </label>
      <div className="flex items-center gap-2">
        <input
          id="player_age"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          defaultValue={currentAge ?? ""}
          key={currentAge ?? "empty"}
          className="w-20 rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-sm border border-primary/50 px-3 py-2 font-heading text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : state.saved && !state.error ? (
            <Check className="size-3.5" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-[var(--closed)]">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="text-xs text-primary">Age updated.</p>
      )}
    </form>
  );
}
