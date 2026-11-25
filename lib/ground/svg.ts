/**
 * Minimal SVG sanitiser for admin-uploaded client logos. Strips anything that
 * could execute script or phone home: <script>/<foreignObject> elements, on*
 * event handlers, javascript:/data:text URLs, and external references in
 * href/xlink:href/url(). Server-only; defence-in-depth on top of the admin gate
 * (only admins can upload) since SVGs render inline.
 *
 * This is deliberately conservative — it removes rather than tries to repair.
 */

const DANGEROUS_ELEMENTS = /<\s*(script|foreignObject|iframe|embed|object|audio|video|animate|set|handler)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SELF_CLOSING_DANGEROUS = /<\s*(script|foreignObject|iframe|embed|object|use|image)\b[^>]*\/\s*>/gi;
const ON_ATTR = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// href / xlink:href / src / url() pointing anywhere external or to a script scheme.
const EXTERNAL_REF = /\s+(?:xlink:)?(?:href|src)\s*=\s*("|')\s*(?:https?:|\/\/|javascript:|data:text|data:application)[^"']*\1/gi;
const URL_FUNC = /url\(\s*(['"]?)\s*(?:https?:|\/\/|javascript:|data:text|data:application)[^)]*\1\s*\)/gi;
const STYLE_EXPR = /\s+style\s*=\s*("[^"]*expression[^"]*"|'[^']*expression[^']*')/gi;

export type SvgSanitizeResult = { ok: true; svg: string } | { ok: false; reason: string };

export function sanitizeSvg(input: string): SvgSanitizeResult {
  let svg = (input ?? "").trim();
  if (!svg) return { ok: false, reason: "Empty file." };
  if (!/<svg[\s>]/i.test(svg)) return { ok: false, reason: "That doesn't look like an SVG." };

  // Drop XML processing instructions / DOCTYPE (can carry entity attacks).
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "");
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  svg = svg.replace(/<!ENTITY[\s\S]*?>/gi, "");

  svg = svg
    .replace(DANGEROUS_ELEMENTS, "")
    .replace(SELF_CLOSING_DANGEROUS, "")
    .replace(ON_ATTR, "")
    .replace(EXTERNAL_REF, "")
    .replace(URL_FUNC, "none")
    .replace(STYLE_EXPR, "");

  // Final guard: if any obvious script scheme survived, reject outright.
  if (/javascript:|<script|on[a-z]+\s*=/i.test(svg)) {
    return { ok: false, reason: "The SVG contains scripting that can't be made safe." };
  }
  return { ok: true, svg };
}
