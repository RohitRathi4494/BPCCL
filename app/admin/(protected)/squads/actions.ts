"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OrderState = { error?: string; saved?: boolean };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Set (or clear) the manual display sequence for one squad member. Lower numbers
 * sort first on the public franchises page + admin all-squads view; an empty
 * value clears the override and the member falls back to the default ordering.
 * Writes `squad_members.display_order` directly via the admin "staff write" RLS
 * policy (no RPC needed).
 */
export async function setSquadOrder(
  _prev: OrderState,
  formData: FormData,
): Promise<OrderState> {
  const playerId = String(formData.get("player_id") ?? "");
  const raw = String(formData.get("display_order") ?? "").trim();

  if (!UUID_RE.test(playerId)) {
    return { error: "Invalid player." };
  }

  let order: number | null = null;
  if (raw !== "") {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      return { error: "Enter a whole number 0–999 (or leave blank)." };
    }
    order = n;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("squad_members")
    .update({ display_order: order })
    .eq("player_id", playerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/squads");
  revalidatePath("/franchises");
  return { saved: true };
}
