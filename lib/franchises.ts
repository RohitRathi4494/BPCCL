/**
 * Presentation metadata for the public Franchises page.
 *
 * Franchise *identity* (name, owner, purse) is owned by the `franchises` DB
 * table — that stays the source of truth. This module only adds the curated
 * marketing layer the DB doesn't carry: the crest artwork (shipped as static
 * assets in `public/franchises/`), a home region, a short tagline, and a per-
 * team accent colour used for subtle glows so each crest reads distinct while
 * the grid stays cohesive on the navy theme.
 *
 * Keyed by the franchise `short_code`. A team with no entry falls back to the
 * league gold accent and its initials — nothing breaks if a new team is added.
 */
export type FranchiseMeta = {
  logo: string;
  region: string;
  tagline: string;
  /** Hex accent for glow/hairline. Chosen to sit well on the navy background. */
  accent: string;
};

export const FRANCHISE_META: Record<string, FranchiseMeta> = {
  BT: {
    logo: "/franchises/bt.png",
    region: "Bengal",
    tagline: "Roar of the East",
    accent: "#f59e0b",
  },
  CT: {
    logo: "/franchises/ct.png",
    region: "Chennai",
    tagline: "Kings of the South",
    accent: "#eab308",
  },
  DDD: {
    logo: "/franchises/ddd.png",
    region: "Delhi",
    tagline: "Capital Firepower",
    accent: "#ef4444",
  },
  DD: {
    logo: "/franchises/dd.png",
    region: "Dehradun",
    tagline: "Thunder from the Valley",
    accent: "#2dd4bf",
  },
  DV: {
    logo: "/franchises/dv.png",
    region: "Dubai",
    tagline: "Strike from the Sands",
    accent: "#34d399",
  },
  HB: {
    logo: "/franchises/hb.png",
    region: "Haryana",
    tagline: "Charge of the Bulls",
    accent: "#dc2626",
  },
  GS: {
    logo: "/franchises/gs.png",
    region: "Gurugram",
    tagline: "Never Surrender",
    accent: "#f43f5e",
  },
  JK: {
    logo: "/franchises/jk.png",
    region: "Jammu & Kashmir",
    tagline: "Bound by the Code",
    accent: "#38bdf8",
  },
  JT: {
    logo: "/franchises/jt.png",
    region: "Rising Sun",
    tagline: "An Unstoppable Wave",
    accent: "#fb7185",
  },
  LL: {
    logo: "/franchises/ll.png",
    region: "Lucknow",
    tagline: "Nawabi Nerve",
    accent: "#a3e635",
  },
  MOC: {
    logo: "/franchises/moc.png",
    region: "Mirzapur",
    tagline: "Purvanchal Power",
    accent: "#a78bfa",
  },
  PR: {
    logo: "/franchises/pr.png",
    region: "Punjab",
    tagline: "Sher-e-Punjab",
    accent: "#facc15",
  },
  RCG: {
    logo: "/franchises/rcg.png",
    region: "Gurgaon",
    tagline: "Challenge Accepted",
    accent: "#e11d48",
  },
  TG: {
    logo: "/franchises/tg.png",
    region: "Texas",
    tagline: "Enter the Arena",
    accent: "#f97316",
  },
};

/** Initials fallback (e.g. "Bengal Tigers" → "BT") when no logo is available. */
export function initialsOf(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
