"use server";

import { createClient } from "@/lib/supabase/server";
import { getLeagueSettings } from "@/lib/queries/settings";
import { getSquadRecipients } from "@/lib/queries/announcements";
import {
  buildAnnouncementVars,
  fillPlaceholders,
} from "@/lib/email/announcement";
import { renderAnnouncementHtml } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

export type AnnouncementState = {
  error?: string;
  sent?: number;
  skipped?: number;
  failed?: number;
  /** Selected players that had no email on file. */
  noEmail?: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Send an admin-composed announcement to the selected squad members. The subject
 * / heading / body are admin-authored templates with {{placeholders}}; they are
 * substituted per-recipient from authoritative server-side data (re-fetched here,
 * not trusted from the client) and wrapped in the branded email shell.
 */
export async function sendAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const subjectTpl = String(formData.get("subject") ?? "").trim();
  const headingTpl = String(formData.get("heading") ?? "").trim();
  const bodyTpl = String(formData.get("body") ?? "").trim();
  const ids = [
    ...new Set(
      formData
        .getAll("player_ids")
        .map((v) => String(v))
        .filter((v) => UUID_RE.test(v)),
    ),
  ];

  if (!subjectTpl) return { error: "Enter a subject." };
  if (!headingTpl) return { error: "Enter an email heading." };
  if (!bodyTpl) return { error: "Write the email body." };
  if (ids.length === 0) return { error: "Select at least one player." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const settings = await getLeagueSettings();
  const fee = settings?.registration_fee ?? 3000;

  const recipients = await getSquadRecipients(ids);
  if (recipients.length === 0) {
    return { error: "Could not load the selected players. Please try again." };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let noEmail = 0;

  const BATCH = 8;
  const withEmail = recipients.filter((r) => r.email);
  noEmail = recipients.length - withEmail.length;

  for (let i = 0; i < withEmail.length; i += BATCH) {
    const batch = withEmail.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (r) => {
        try {
          const vars = buildAnnouncementVars(
            {
              player_name: r.name,
              franchise_name: r.franchise_name,
              franchise_code: r.franchise_code,
              category: r.category,
              price: r.price,
              registration_code: r.registration_code,
            },
            fee,
          );
          const subject = fillPlaceholders(subjectTpl, vars);
          const heading = fillPlaceholders(headingTpl, vars);
          const bodyText = fillPlaceholders(bodyTpl, vars);
          const html = renderAnnouncementHtml({
            heading,
            bodyText,
            preview: `${r.franchise_name} — USCL Season 2`,
          });
          const res = await sendEmail({ to: r.email!, subject, html });
          return res.skipped ? "skipped" : res.ok ? "sent" : "failed";
        } catch (e) {
          console.error("sendAnnouncement email:", e);
          return "failed" as const;
        }
      }),
    );
    for (const outcome of results) {
      if (outcome === "sent") sent++;
      else if (outcome === "skipped") skipped++;
      else failed++;
    }
  }

  return { sent, skipped, failed, noEmail };
}
