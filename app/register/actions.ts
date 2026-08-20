"use server";

import { createClient } from "@/lib/supabase/server";
import {
  MIN_AGE,
  MAX_AGE,
  TSHIRT_SIZES,
  LOWER_SIZES,
  OTHER_SIZE,
  PLAYER_ROLES,
  STAT_FIELDS,
  normalizePhone,
  isValidPhone,
  computeAge,
  generateRegistrationCode,
} from "@/lib/registration";
import type { TablesInsert } from "@/lib/types";
import { sendEmail } from "@/lib/email/send";
import { confirmationEmail } from "@/lib/email/templates";

export type RegistrationState = {
  status: "idle" | "success" | "error" | "duplicate";
  message?: string;
  errors?: Record<string, string>;
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Resolve a size dropdown value, honouring the "Other" free-text field. */
function resolveSize(
  selected: string,
  other: string,
  allowed: readonly string[],
): { value: string | null; error?: string } {
  if (!selected) return { value: null, error: "Please select a size." };
  if (selected === OTHER_SIZE) {
    const v = other.trim();
    if (!v) return { value: null, error: "Enter your size." };
    return { value: v.slice(0, 20) };
  }
  if (!allowed.includes(selected)) return { value: null, error: "Pick a valid size." };
  return { value: selected };
}

export async function submitRegistration(
  _prev: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const full_name = get("full_name");
  const dob = get("dob");
  const phoneRaw = get("phone");
  const email = get("email");
  const company = get("company");
  const work_email = get("work_email");
  const photo_url = get("photo_url");
  const cricheroesRaw = get("cricheroes_url");
  const linkedinRaw = get("linkedin_url");
  const jersey_number = get("jersey_number");
  const jersey_name = get("jersey_name");
  const consent = formData.get("consent") === "on";
  const confirmDuplicate = formData.get("confirm_duplicate") === "true";

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = "Please enter your full name.";

  // DOB → age, enforcing the 30+ eligibility rule.
  let age = 0;
  if (!dob) {
    errors.dob = "Please enter your date of birth.";
  } else {
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      errors.dob = "Enter a valid date of birth.";
    } else {
      age = computeAge(dob);
      if (age < MIN_AGE) errors.dob = `USCL is open to players aged ${MIN_AGE} and above.`;
      else if (age > MAX_AGE) errors.dob = "Please double-check your date of birth.";
    }
  }

  const phone = normalizePhone(phoneRaw);
  if (!phoneRaw) errors.phone = "Please enter a contact number.";
  else if (!isValidPhone(phone)) errors.phone = "Enter a valid contact number (10–13 digits).";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!company) errors.company = "Please enter your company.";

  // Work email preferred, but a personal email is accepted as a fallback.
  if (!work_email) errors.work_email = "Please enter a work or personal email.";
  else if (!EMAIL_RE.test(work_email))
    errors.work_email = "Enter a valid email address.";

  if (!photo_url) errors.photo_url = "Please upload a player photo.";

  const cricheroes_url = normalizeUrl(cricheroesRaw);
  if (!cricheroesRaw) errors.cricheroes_url = "A CricHeroes profile link is required.";
  else if (!cricheroes_url) errors.cricheroes_url = "Enter a valid link.";

  const linkedin_url = normalizeUrl(linkedinRaw);
  if (!linkedinRaw) errors.linkedin_url = "A LinkedIn profile link is required.";
  else if (!linkedin_url) errors.linkedin_url = "Enter a valid LinkedIn URL.";

  const tshirt = resolveSize(get("tshirt_size"), get("tshirt_size_other"), TSHIRT_SIZES);
  if (tshirt.error) errors.tshirt_size = tshirt.error;

  const lower = resolveSize(get("lower_size"), get("lower_size_other"), LOWER_SIZES);
  if (lower.error) errors.lower_size = lower.error;

  if (!jersey_number) errors.jersey_number = "Enter your jersey number.";
  else if (!/^\d{1,3}$/.test(jersey_number))
    errors.jersey_number = "Jersey number must be 1–3 digits.";

  if (!jersey_name) errors.jersey_name = "Enter the name for your jersey.";
  else if (jersey_name.length > 20) errors.jersey_name = "Keep it under 20 characters.";

  // Playing roles — multi-select, at least one, all from the known list.
  const allowedRoles = new Set<string>(PLAYER_ROLES);
  const roles = formData
    .getAll("roles")
    .map((r) => String(r).trim())
    .filter((r) => allowedRoles.has(r));
  if (roles.length === 0) errors.roles = "Select at least one playing role.";

  // Career stats — all required; "NA" is a valid answer where inapplicable.
  const stats: Record<string, string> = {};
  for (const f of STAT_FIELDS) {
    const v = get(f.key);
    if (!v) errors[f.key] = `Enter ${f.label} (or NA).`;
    else if (v.length > 20) errors[f.key] = "Keep it under 20 characters.";
    else stats[f.key] = v;
  }

  if (!consent)
    errors.consent = "You must agree to the registration fee to register.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", errors };
  }

  const supabase = await createClient();

  // Soft duplicate-phone check (warn, don't hard-block).
  if (!confirmDuplicate) {
    const { data: count, error: rpcError } = await supabase.rpc(
      "check_phone_registered",
      { p_phone: phone },
    );
    if (!rpcError && typeof count === "number" && count > 0) {
      return {
        status: "duplicate",
        message:
          "A registration with this contact number already exists. If this is a correction or a second attempt, you can submit anyway.",
      };
    }
    if (rpcError) console.error("check_phone_registered:", rpcError.message);
  }

  const payload: TablesInsert<"players"> = {
    full_name,
    phone,
    email,
    age,
    dob,
    company,
    work_email,
    photo_url,
    cricheroes_url,
    linkedin_url,
    tshirt_size: tshirt.value,
    lower_size: lower.value,
    jersey_number,
    jersey_name,
    roles,
    ...stats,
    registration_fee_agreed: true,
  };

  // Assign a unique registration code, retrying on the rare code collision
  // (23505 = unique_violation). No .select() — RLS lets the public INSERT but
  // not SELECT the players table, so we track the code we generated ourselves.
  let registrationCode = "";
  let insertError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    registrationCode = generateRegistrationCode();
    const { error } = await supabase
      .from("players")
      .insert({ ...payload, registration_code: registrationCode });
    if (!error) {
      insertError = null;
      break;
    }
    insertError = error;
    if (error.code !== "23505") break; // not a code collision — real failure
  }

  if (insertError) {
    console.error("submitRegistration:", insertError.message);
    return {
      status: "error",
      message: "Something went wrong saving your registration. Please try again.",
    };
  }

  // Fire the confirmation email — never let an email failure break registration.
  try {
    const { subject, html } = confirmationEmail(full_name, registrationCode);
    await sendEmail({ to: email, subject, html });
  } catch (e) {
    console.error("confirmation email:", e);
  }

  return {
    status: "success",
    message:
      `You're registered! Your registration ID is ${registrationCode} — we've emailed it to you too. ` +
      "Our reviewers will assess your profile ahead of the auction. If you're selected, you'll be contacted about the registration fee.",
  };
}
