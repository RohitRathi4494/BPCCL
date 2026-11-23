import { NextRequest } from "next/server";
import { site } from "@/lib/site";

/** Escape text for an iCalendar value. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** YYYYMMDDTHHMMSSZ in UTC. */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate a downloadable .ics calendar event.
 *   /api/ics?title=Auction%20Day&date=2027-01-24T09:00:00%2B05:30
 * A 2-hour default duration is used. Invalid/missing params → 400.
 */
export function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.slice(0, 120) || `${site.shortName} event`;
  const dateRaw = req.nextUrl.searchParams.get("date");
  const start = dateRaw ? new Date(dateRaw) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return new Response("Missing or invalid 'date'.", { status: 400 });
  }
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const loc = site.venue.full !== "Venue to be announced" ? site.venue.full : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${esc(site.shortName)}//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}-${Math.abs(hash(title))}@bpccl`,
    `DTSTAMP:${stamp(new Date(0))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${site.shortName} — ${title}`)}`,
    loc ? `LOCATION:${esc(loc)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics"`,
    },
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
