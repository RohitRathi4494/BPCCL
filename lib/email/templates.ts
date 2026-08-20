import { site } from "@/lib/site";

/**
 * Simple, inline-styled HTML email templates (email clients need inline CSS).
 * Brand: deep royal navy + championship gold accent, matching the site crest.
 */

const NAVY = "#0a1e3d"; // card background
const NAVY_SOFT = "#0f2950"; // insets / callouts
const GOLD = "#f4b324"; // accent
const CREAM = "#eaf1fb"; // body text
const SLATE = "#9bb0d0"; // muted text
const CRIMSON = "#d42433"; // rejection accent
const PAGE_BG = "#eef2f7"; // outer page background

/** Hidden inbox-preview text (shows next to the subject in most clients). */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(
    text,
  )}</div>`;
}

function shell(
  heading: string,
  bodyHtml: string,
  opts: { preview?: string } = {},
): string {
  return `
  ${opts.preview ? preheader(opts.preview) : ""}
  <div style="margin:0;padding:24px;background:${PAGE_BG};font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:${NAVY};border-radius:14px;overflow:hidden;border:1px solid #d7dee8;">
      <!-- Header / brand lockup -->
      <div style="padding:26px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="display:inline-block;background:${GOLD};color:${NAVY};font-weight:bold;font-size:15px;width:36px;height:36px;line-height:36px;text-align:center;border-radius:7px;vertical-align:middle;">US</span>
        <span style="color:${CREAM};font-weight:bold;letter-spacing:2px;font-size:16px;margin-left:11px;vertical-align:middle;">USCL</span>
        <span style="color:${SLATE};font-size:11px;letter-spacing:2px;margin-left:8px;vertical-align:middle;">${site.season.toUpperCase()}</span>
      </div>
      <!-- Gold rule -->
      <div style="height:3px;background:${GOLD};"></div>
      <!-- Body -->
      <div style="padding:32px;">
        <h1 style="color:${CREAM};font-size:23px;margin:0 0 16px;">${heading}</h1>
        <div style="color:${CREAM};font-size:15px;line-height:1.6;">${bodyHtml}</div>
      </div>
      <!-- Footer -->
      <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);color:${SLATE};font-size:12px;line-height:1.5;">
        ${site.name} &middot; ${site.season}<br/>
        ${site.venue.full}
      </div>
    </div>
    <div style="max-width:560px;margin:12px auto 0;color:#9aa7b8;font-size:11px;text-align:center;">
      This is an automated message about your ${escapeHtml(site.shortName)} registration.
    </div>
  </div>`;
}

export function confirmationEmail(
  fullName: string,
  registrationCode?: string,
): {
  subject: string;
  html: string;
} {
  return {
    subject: `We've received your USCL ${site.season} registration`,
    html: shell(
      "Registration received",
      `<p style="margin:0 0 14px;">Hi ${escapeHtml(fullName)},</p>
       <p style="margin:0 0 14px;">Thanks for registering for <strong>${site.name} ${site.season}</strong>.
       Your details are in, and our reviewers will assess your CricHeroes profile and assign you a
       category ahead of the player auction.</p>
       ${
         registrationCode
           ? `<div style="margin:0 0 18px;padding:14px 18px;background:${NAVY_SOFT};border-left:3px solid ${GOLD};border-radius:6px;">
                <span style="color:${SLATE};font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your registration ID</span><br/>
                <strong style="color:${CREAM};font-size:20px;letter-spacing:2px;">${escapeHtml(
                  registrationCode,
                )}</strong><br/>
                <span style="color:${SLATE};font-size:12px;">Keep this handy &mdash; quote it in any correspondence with us.</span>
              </div>`
           : ""
       }
       <p style="margin:0 0 14px;">We'll email you again once a decision is made. If you're selected by a
       franchise during the auction, the registration fee you agreed to on the form will apply.</p>
       <p style="margin:0;color:${SLATE};">See you on the pitch &mdash; ${site.venue.name}, ${site.venue.city}.</p>`,
      {
        preview: `Your ${site.shortName} ${site.season} registration is in &mdash; we'll be in touch after review.`,
      },
    ),
  };
}

export function approvalEmail(
  fullName: string,
  category: string | null,
): { subject: string; html: string } {
  return {
    subject: `You're approved for the USCL ${site.season} auction`,
    html: shell(
      "You're in the auction pool",
      `<p style="margin:0 0 14px;">Hi ${escapeHtml(fullName)},</p>
       <p style="margin:0 0 14px;">Great news &mdash; you've been
       <strong style="color:${GOLD};">approved</strong> for the ${site.name} ${site.season} auction.</p>
       ${
         category
           ? `<div style="margin:0 0 18px;padding:14px 18px;background:${NAVY_SOFT};border-left:3px solid ${GOLD};border-radius:6px;">
                <span style="color:${SLATE};font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your assigned category</span><br/>
                <strong style="color:${CREAM};font-size:18px;">${escapeHtml(category)}</strong>
              </div>`
           : ""
       }
       <p style="margin:0 0 14px;">When the auction goes live, all franchises can bid to draft you into
       their squad. If you're picked, we'll be in touch about next steps and the registration fee.</p>
       <p style="margin:0;color:${SLATE};">Best of luck &mdash; you've earned your place in the pool.</p>`,
      {
        preview: `You're approved for the ${site.shortName} ${site.season} auction${
          category ? ` &mdash; category ${category}` : ""
        }.`,
      },
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
      `<p style="margin:0 0 14px;">Hi ${escapeHtml(fullName)},</p>
       <p style="margin:0 0 14px;">Thank you for registering for ${site.name} ${site.season}. After review,
       we're unable to include you in the auction pool at this time.</p>
       <div style="margin:0 0 16px;padding:14px 18px;background:${NAVY_SOFT};border-left:3px solid ${CRIMSON};border-radius:6px;">
         <span style="color:${SLATE};font-size:12px;letter-spacing:1px;text-transform:uppercase;">Reason</span><br/>
         <span style="color:${CREAM};">${escapeHtml(reason)}</span>
       </div>
       <p style="margin:0;color:${SLATE};">We appreciate your interest and hope to see you in a future season.</p>`,
      {
        preview: `An update on your ${site.shortName} ${site.season} registration.`,
      },
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
