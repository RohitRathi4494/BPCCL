"use server";

import { createClient } from "@/lib/supabase/server";
import { SPONSOR_TIERS } from "@/lib/site";
import type { TablesInsert } from "@/lib/types";
import { sendEmail } from "@/lib/email/send";
import { sponsorEnquiryEmail } from "@/lib/email/templates";

/**
 * Where sponsor-enquiry notification emails are sent for review. Read from the
 * SPONSOR_ENQUIRY_TO env var — there is deliberately NO hard-coded default, so
 * no enquiry ever goes to a stale/foreign inbox. If it's unset, the enquiry is
 * still stored in the DB; only the notification email is skipped.
 */
const ENQUIRY_INBOX = process.env.SPONSOR_ENQUIRY_TO?.trim() || "";

export type EnquiryState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitSponsorEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const contact_name = String(formData.get("contact_name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const tier_interest = String(formData.get("tier_interest") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const errors: Record<string, string> = {};
  if (!contact_name) errors.contact_name = "Please enter your name.";
  if (!company) errors.company = "Please enter your company.";
  if (!email) errors.email = "Please enter an email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (tier_interest && !SPONSOR_TIERS.includes(tier_interest as never))
    errors.tier_interest = "Pick a valid tier.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Please fix the fields below.", errors };
  }

  const payload: TablesInsert<"sponsor_enquiries"> = {
    contact_name,
    company,
    email,
    phone: phone || null,
    tier_interest: tier_interest || null,
    message: message || null,
  };

  const supabase = await createClient();
  // No .select() — RLS lets the public INSERT but not SELECT this table.
  const { error } = await supabase.from("sponsor_enquiries").insert(payload);

  if (error) {
    // Table not migrated yet — fail gracefully rather than 500.
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.error("sponsor_enquiries table missing — run `supabase db push`.");
      return {
        status: "error",
        message:
          "Enquiries aren't quite live yet. Please email us directly for now.",
      };
    }
    console.error("submitSponsorEnquiry:", error.message);
    return {
      status: "error",
      message: "Something went wrong. Please try again in a moment.",
    };
  }

  // Notify the partnerships inbox — never let an email failure break the
  // submission (the enquiry is already safely stored above). Skipped entirely
  // when SPONSOR_ENQUIRY_TO isn't configured.
  try {
    if (!ENQUIRY_INBOX) {
      console.warn(
        "sponsor enquiry stored but not emailed — SPONSOR_ENQUIRY_TO is not set.",
      );
      return {
        status: "success",
        message:
          "Thanks — your enquiry is in. Our partnerships team will be in touch shortly.",
      };
    }
    const { subject, html } = sponsorEnquiryEmail({
      contact_name,
      company,
      email,
      phone: phone || null,
      tier_interest: tier_interest || null,
      message: message || null,
    });
    await sendEmail({
      to: ENQUIRY_INBOX,
      subject,
      html,
      replyTo: email, // reply goes straight to the sponsor
    });
  } catch (e) {
    console.error("sponsor enquiry email:", e);
  }

  return {
    status: "success",
    message:
      "Thanks — your enquiry is in. Our partnerships team will be in touch shortly.",
  };
}
