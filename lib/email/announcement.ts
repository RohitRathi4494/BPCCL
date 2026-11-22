/**
 * Shared (client + server safe) helpers for the admin "Notify Players"
 * announcement composer. No server-only imports here so the composer UI can
 * reuse the same placeholder list + substitution for its live preview.
 *
 * Only pure brand constants are imported (league.config) — no server-only code.
 */
import { leagueConfig } from "@/lib/league.config";

/** A placeholder the admin can drop into the subject / heading / body. */
export type Placeholder = {
  token: string; // e.g. "{{player_name}}"
  key: string; // e.g. "player_name"
  label: string;
  example: string;
};

export const ANNOUNCEMENT_PLACEHOLDERS: Placeholder[] = [
  {
    token: "{{player_name}}",
    key: "player_name",
    label: "Player name",
    example: "Rohit Sharma",
  },
  {
    token: "{{franchise_name}}",
    key: "franchise_name",
    label: "Franchise sold to",
    example: "Gurugram Gladiators",
  },
  {
    token: "{{franchise_code}}",
    key: "franchise_code",
    label: "Franchise short code",
    example: "GGL",
  },
  {
    token: "{{category}}",
    key: "category",
    label: "Player category",
    example: "Category A",
  },
  {
    token: "{{price}}",
    key: "price",
    label: "Bid amount (points)",
    example: "12,000",
  },
  {
    token: "{{registration_fee}}",
    key: "registration_fee",
    label: "Registration fee (₹)",
    example: "3,000",
  },
  {
    token: "{{registration_code}}",
    key: "registration_code",
    label: "Registration ID",
    example: `${leagueConfig.registrationCodePrefix}-7K3M9Q`,
  },
];

/**
 * Replace every {{placeholder}} token in `tpl` with the matching value from
 * `vars`. Tolerant of inner whitespace ({{ player_name }}). Unknown tokens are
 * left untouched so a typo is visible rather than silently blanked.
 */
export function fillPlaceholders(
  tpl: string,
  vars: Record<string, string>,
): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, rawKey) => {
    const key = String(rawKey).toLowerCase();
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

/** The data each recipient contributes to placeholder substitution. */
export type AnnouncementRecipientVars = {
  player_name: string;
  franchise_name: string;
  franchise_code: string | null;
  category: string | null;
  price: number;
  registration_code: string | null;
};

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

/** Build the substitution map for one recipient. */
export function buildAnnouncementVars(
  r: AnnouncementRecipientVars,
  registrationFee: number,
): Record<string, string> {
  return {
    player_name: r.player_name || "",
    franchise_name: r.franchise_name || "",
    franchise_code: r.franchise_code ?? "",
    category: r.category ?? "",
    price: inr(r.price ?? 0),
    registration_fee: inr(registrationFee),
    registration_code: r.registration_code ?? "",
  };
}

/** Sensible default the composer pre-fills — the admin can edit freely. */
export const DEFAULT_ANNOUNCEMENT = {
  subject: `Congratulations! You've been drafted by {{franchise_name}} — ${leagueConfig.name} ${leagueConfig.season}`,
  heading: "Welcome to {{franchise_name}}!",
  body: `Hi {{player_name}},

Congratulations! You have been drafted by {{franchise_name}} in the ${leagueConfig.name} ${leagueConfig.season} auction. The whole franchise is thrilled to have you in the squad.

To confirm your place in the team, please pay your registration fee of ₹{{registration_fee}} directly to your franchise owner. Your owner will share the payment details with you.

We can't wait to see you take the field. Let's make this season count!

Best of luck,
Team ${leagueConfig.shortName}`,
};
