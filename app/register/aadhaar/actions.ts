"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/registration";

export type AttachState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Attach an Aadhaar card to an existing registration. Identity is verified by
 * the player's registration code + registered phone (via the attach_aadhaar
 * RPC). The file itself was already uploaded to the private bucket by the
 * client; here we just record its path against the matching player.
 */
export async function attachAadhaar(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const code = String(formData.get("registration_code") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const path = String(formData.get("aadhaar_path") ?? "").trim();

  if (!code) return { status: "error", message: "Enter your registration ID." };
  if (!phoneRaw)
    return { status: "error", message: "Enter your registered phone number." };
  if (!path)
    return { status: "error", message: "Upload your Aadhaar card first." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("attach_aadhaar", {
    p_code: code,
    p_phone: normalizePhone(phoneRaw),
    p_path: path,
  });

  if (error) {
    console.error("attachAadhaar:", error.message);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const r = data as { ok: boolean; error?: string; name?: string } | null;
  if (!r || !r.ok) {
    return {
      status: "error",
      message: r?.error ?? "Could not save your Aadhaar. Please try again.",
    };
  }

  return {
    status: "success",
    message: `Thanks${r.name ? `, ${r.name}` : ""}! Your Aadhaar card has been added to your registration.`,
  };
}
