/**
 * FAQ token rendering. FAQ rows live in the `faqs` table (admin-editable); a
 * couple of answers reference league numbers via tokens so the age rule and the
 * fee keep a single source of truth and ₹0 is never shown.
 *
 * Supported tokens:
 *   {{age_rule}}    → the full eligibility clause (from league_settings).
 *   {{fee}}         → "₹500" when a fee is set; a neutral phrase otherwise.
 *   {{fee_clause}}  → " of ₹500" when set; "" otherwise (so the sentence still
 *                     reads correctly with no fee).
 *
 * Pure — safe for Server and Client Components.
 */
import { ageRuleSentence, type AgeRuleInput } from "@/lib/ground/age";

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export type FaqTokenSettings = AgeRuleInput & { registration_fee?: number | null };

export function renderFaqAnswer(answer: string, settings: FaqTokenSettings): string {
  const fee = settings?.registration_fee ?? 0;
  const feeSet = typeof fee === "number" && fee > 0;
  return answer
    .replace(/\{\{\s*age_rule\s*\}\}/g, ageRuleSentence(settings))
    .replace(/\{\{\s*fee_clause\s*\}\}/g, feeSet ? ` of ₹${inr(fee)}` : "")
    .replace(/\{\{\s*fee\s*\}\}/g, feeSet ? `₹${inr(fee)}` : "the registration fee")
    .trim();
}
