import { site } from "@/lib/site";

/**
 * Simple, inline-styled HTML email templates (email clients need inline CSS).
 * Brand: deep green + neon-green accent, matching the site.
 */

const NAVY = "#0e2a2e";
const LIME = "#31d678";
const CREAM = "#edf4ee";
const SLATE = "#8aa595";

function shell(heading: string, bodyHtml: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f2efe8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:${NAVY};border-radius:14px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="display:inline-block;background:${LIME};color:${NAVY};font-weight:bold;font-size:16px;width:34px;height:34px;line-height:34px;text-align:center;border-radius:6px;">U</span>
        <span style="color:${CREAM};font-weight:bold;letter-spacing:2px;font-size:16px;margin-left:10px;vertical-align:middle;">USCL</span>
        <span style="color:${SLATE};font-size:11px;letter-spacing:2px;margin-left:8px;vertical-align:middle;">${site.season.toUpperCase()}</span>
      </div>
      <div style="padding:32px;">
        <h1 style="color:${CREAM};font-size:24px;margin:0 0 16px;">${heading}</h1>
        <div style="color:${CREAM};font-size:15px;line-height:1.6;">${bodyHtml}</div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);color:${SLATE};font-size:12px;">
        ${site.name} · ${site.venue.full}
      </div>
    </div>
  </div>`;
}

export function confirmationEmail(fullName: string): {
  subject: string;
  html: string;
} {
  return {
    subject: `We've received your USCL ${site.season} registration`,
    html: shell(
      "Registration received",
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Thanks for registering for <strong>${site.name} ${site.season}</strong>.
       Your details are in and our reviewers will assess your profile ahead of the auction.</p>
       <p>We'll email you again once a decision is made. If you're selected during the auction,
       a registration fee applies as noted on the form.</p>
       <p style="color:${SLATE};">See you on the pitch — ${site.venue.name}, ${site.venue.city}.</p>`,
    ),
  };
}

export function approvalEmail(
  fullName: string,
  grade: string | null,
): { subject: string; html: string } {
  return {
    subject: `You're approved for the USCL ${site.season} auction`,
    html: shell(
      "You're in the auction pool",
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Great news — you've been <strong style="color:${LIME};">approved</strong> for the
       ${site.name} ${site.season} auction.</p>
       ${
         grade
           ? `<p>Your assigned grade: <strong>${escapeHtml(grade)}</strong>.</p>`
           : ""
       }
       <p>Franchises will bid to draft you when the auction goes live. If you're picked,
       we'll be in touch about next steps and the registration fee.</p>
       <p style="color:${SLATE};">Best of luck!</p>`,
    ),
  };
}

export function rejectionEmail(
  fullName: string,
  reason: string,
): { subject: string; html: string } {
  return {
    subject: `Update on your USCL ${site.season} registration`,
    html: shell(
      "Registration update",
      `<p>Hi ${escapeHtml(fullName)},</p>
       <p>Thank you for registering for ${site.name} ${site.season}. After review, we're
       unable to include you in the auction pool at this time.</p>
       <p style="background:rgba(255,255,255,0.05);border-left:3px solid ${LIME};padding:12px 16px;border-radius:4px;">
       <strong>Reason:</strong> ${escapeHtml(reason)}</p>
       <p style="color:${SLATE};">We appreciate your interest and hope to see you in a future season.</p>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
