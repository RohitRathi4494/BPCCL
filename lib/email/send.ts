/**
 * Server-only. Do not import into Client Components — it reads SMTP secrets.
 *
 * Transactional email over SMTP (Gmail / Google Workspace) via Nodemailer.
 *
 * Configured via env (server-only):
 *   SMTP_HOST      — default "smtp.gmail.com"
 *   SMTP_PORT      — default 465 (SSL)
 *   SMTP_USER      — the sending Gmail/Workspace address
 *   SMTP_PASSWORD  — a Google App Password (requires 2FA on the account)
 *   EMAIL_FROM     — display sender, e.g. "USCL <you@yourdomain.com>"
 *                    (falls back to SMTP_USER if unset)
 *
 * Degrades gracefully: if SMTP_USER/PASSWORD aren't set it logs and returns
 * { ok:false, skipped:true } instead of throwing — so registration/approval
 * flows never fail just because email isn't configured yet.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/** CID referenced by the email templates' header (see templates.ts shell). */
export const BRAND_LOGO_CID = "uscl-logo";

let transporter: nodemailer.Transporter | null = null;
let logoAttachment: { filename: string; content: Buffer; cid: string } | null =
  null;
let logoLoaded = false;

/**
 * Load the brand logo once and cache it as an inline attachment. Returns null
 * if the file can't be read, so a missing logo never blocks an email — the
 * template's <img alt="USCL"> just falls back to its alt text.
 */
async function getLogoAttachment() {
  if (logoLoaded) return logoAttachment;
  logoLoaded = true;
  try {
    const file = path.join(process.cwd(), "public", "uscl-logo.png");
    logoAttachment = {
      filename: "uscl-logo.png",
      content: await readFile(file),
      cid: BRAND_LOGO_CID,
    };
  } catch (err) {
    console.warn("[email] brand logo not found — sending without it.", err);
    logoAttachment = null;
  }
  return logoAttachment;
}

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(
      `[email] Skipped "${opts.subject}" to ${opts.to} — SMTP_USER/SMTP_PASSWORD not set.`,
    );
    return { ok: false, skipped: true };
  }
  if (!opts.to) return { ok: false, error: "No recipient" };

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  const logo = await getLogoAttachment();

  try {
    await tx.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(logo ? { attachments: [logo] } : {}),
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: "send failed" };
  }
}
