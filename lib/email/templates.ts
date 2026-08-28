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
        <img src="cid:uscl-logo" alt="USCL" height="40" style="height:40px;width:auto;vertical-align:middle;display:inline-block;" />
        <span style="color:${CREAM};font-weight:bold;letter-spacing:2px;font-size:16px;margin-left:12px;vertical-align:middle;">USCL</span>
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

/**
 * Reminder to a player who registered before the Aadhaar upload was required,
 * with their registration ID and a link to add it self-service.
 */
export function aadhaarReminderEmail(
  fullName: string,
  registrationCode: string | null,
  url: string,
): { subject: string; html: string } {
  return {
    subject: `Action needed: add your Aadhaar card — USCL ${site.season}`,
    html: shell(
      "Add your Aadhaar card",
      `<p style="margin:0 0 14px;">Hi ${escapeHtml(fullName)},</p>
       <p style="margin:0 0 14px;">To complete your <strong>${site.name} ${site.season}</strong>
       registration, we now need a photo of your <strong>Aadhaar card</strong> to verify your identity
       for the league. It takes under a minute and no login is required.</p>
       ${
         registrationCode
           ? `<div style="margin:0 0 18px;padding:14px 18px;background:${NAVY_SOFT};border-left:3px solid ${GOLD};border-radius:6px;">
                <span style="color:${SLATE};font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your registration ID</span><br/>
                <strong style="color:${CREAM};font-size:20px;letter-spacing:2px;">${escapeHtml(
                  registrationCode,
                )}</strong><br/>
                <span style="color:${SLATE};font-size:12px;">You'll need this and your registered phone number.</span>
              </div>`
           : ""
       }
       <p style="margin:0 0 22px;">
         <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;background:${GOLD};color:${NAVY};font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">Add your Aadhaar card</a>
       </p>
       <p style="margin:0 0 14px;color:${SLATE};font-size:13px;">Or paste this link into your browser:<br/>
       <span style="color:${CREAM};">${escapeHtml(url)}</span></p>
       <p style="margin:0;color:${SLATE};">Your Aadhaar is used only for identity verification, stored securely,
       and visible only to league admins.</p>`,
      {
        preview: `Add your Aadhaar card to complete your ${site.shortName} ${site.season} registration.`,
      },
    ),
  };
}

/**
 * Internal notification sent to the partnerships inbox when a sponsor submits
 * the enquiry form. Reply-to is set to the sponsor's email by the caller, so a
 * reply goes straight back to them.
 */
export function sponsorEnquiryEmail(data: {
  contact_name: string;
  company: string;
  email: string;
  phone: string | null;
  tier_interest: string | null;
  message: string | null;
}): { subject: string; html: string } {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:8px 0;color:${SLATE};font-size:12px;letter-spacing:1px;text-transform:uppercase;width:130px;vertical-align:top;">${label}</td>
       <td style="padding:8px 0;color:${CREAM};font-size:15px;">${value}</td>
     </tr>`;
  return {
    subject: `New sponsor enquiry — ${data.company}`,
    html: shell(
      "New sponsor enquiry",
      `<p style="margin:0 0 16px;">A sponsor just submitted the enquiry form. Details below &mdash;
       reply to this email to reach them directly.</p>
       <table style="width:100%;border-collapse:collapse;border-top:1px solid rgba(255,255,255,0.08);">
         ${row("Contact", escapeHtml(data.contact_name))}
         ${row("Company", escapeHtml(data.company))}
         ${row("Email", `<a href="mailto:${escapeHtml(data.email)}" style="color:${GOLD};">${escapeHtml(data.email)}</a>`)}
         ${row("Phone", data.phone ? escapeHtml(data.phone) : "&mdash;")}
         ${row("Tier", data.tier_interest ? escapeHtml(data.tier_interest) : "&mdash;")}
         ${row("Message", data.message ? escapeHtml(data.message).replace(/\n/g, "<br/>") : "&mdash;")}
       </table>`,
      {
        preview: `${data.company} is interested${
          data.tier_interest ? ` in the ${data.tier_interest} tier` : ""
        }.`,
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
