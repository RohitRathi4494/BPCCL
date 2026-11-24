import Link from "next/link";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";
import { BallGlyph } from "@/components/site/primitives";
import {
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
} from "@/components/site/social-icons";

const linkCols = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Teams", href: "/franchises" },
  { label: "Fixtures", href: "/fixtures" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Admin Login", href: "/admin/login" },
];

function socialList() {
  const s = leagueConfig.socials;
  return [
    { label: "Instagram", href: s.instagram, Icon: InstagramIcon },
    { label: "LinkedIn", href: s.linkedin, Icon: LinkedInIcon },
    { label: "WhatsApp", href: s.whatsapp, Icon: WhatsAppIcon },
  ].filter((x) => x.href);
}

/** "SAT 24 JAN \ 09:00" IST line for the next key date. */
function nextLine(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d
    .toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Kolkata",
    })
    .toUpperCase();
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  return `${day} \\ ${time}`;
}

export function SiteFooter({ nextDateIso }: { nextDateIso?: string | null }) {
  const socials = socialList();
  const next = nextLine(nextDateIso ?? null);
  const venue = site.venue.full !== "Venue to be announced" ? site.venue.full : null;

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-6">
        <div className="mb-12 flex flex-col items-start gap-4 border-b border-white/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={leagueConfig.logos.main}
              alt={`${site.name} crest`}
              width={56}
              height={59}
              className="h-12 w-auto"
            />
            <div className="flex flex-col">
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                {site.name}
              </span>
              <span className="eyebrow text-white/50">{site.season}</span>
            </div>
          </div>
          {site.tagline && (
            <p className="max-w-xs text-sm text-white/55 sm:text-right">{site.tagline}.</p>
          )}
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          {/* Left — links */}
          <nav className="flex flex-col gap-3">
            {linkCols.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="w-fit text-sm text-white/70 transition-colors hover:text-gold-400"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Centre — next date + address */}
          <div className="flex flex-col items-start gap-2 md:items-center md:text-center">
            {next && (
              <p className="font-display text-lg font-semibold tracking-tight text-white">
                {next}
              </p>
            )}
            {venue && <p className="max-w-xs text-sm text-white/60">{venue}</p>}
            {leagueConfig.contactPhone && (
              <a
                href={`tel:${leagueConfig.contactPhone.replace(/\s/g, "")}`}
                className="text-sm text-white/70 hover:text-gold-400"
              >
                {leagueConfig.contactPhone}
              </a>
            )}
            {leagueConfig.contactEmail && (
              <a
                href={`mailto:${leagueConfig.contactEmail}`}
                className="text-sm text-white/70 hover:text-gold-400"
              >
                {leagueConfig.contactEmail}
              </a>
            )}
          </div>

          {/* Right — socials + back to top */}
          <div className="flex flex-col items-start gap-5 md:items-end">
            {socials.length > 0 && (
              <div className="flex gap-2.5">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-gold-400 hover:text-gold-400"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              Back to top <ArrowUp className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Giant wordmark — rendered as a self-fitting SVG so the full word is
            always visible: textLength locks it to the viewBox width and the SVG
            scales to the container, so it can never overflow and clip. */}
        <svg
          aria-hidden
          role="presentation"
          viewBox="0 0 1200 180"
          className="mt-14 block w-full select-none overflow-visible"
        >
          <defs>
            <linearGradient id="footer-wordmark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>
          <text
            x="600"
            y="140"
            textAnchor="middle"
            textLength="1200"
            lengthAdjust="spacing"
            fill="url(#footer-wordmark)"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "170px",
              letterSpacing: "-0.03em",
            }}
          >
            BALLPARK
          </text>
        </svg>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 sm:flex-row">
          <p className="inline-flex items-center gap-2 text-xs tracking-wide text-white/50 uppercase">
            <BallGlyph className="text-gold-400" /> {site.shortName} · {site.name}
          </p>
          <p className="text-xs tracking-wide text-white/40 uppercase">
            © {new Date().getFullYear()} · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
