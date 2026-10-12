/**
 * Free NPA-NXX prioritisation from official CNAC CSV (original assignment only).
 * NEVER proof of current line type: numbers are portable (CRTC). Never write
 * line_type='mobile'/'verified' from this, never unlock dispatch from it.
 */
import data from "@/data/cnac/qc-npa-nxx.json";

export type PrefixClass =
  | "prefix_mobile_probable"
  | "prefix_landline_probable"
  | "prefix_voip_or_unknown"
  | "prefix_unassigned_or_special";

const MOBILE = [/^Bell Mobility/i, /^TELUS Mobility/i, /\(Wireless\)/i, /^Fido/i];
const LANDLINE = [/^Bell Canada$/i, /^Bell Aliant/i, /^TELUS Quebec/i, /^Telebec/i, /\(Cable\)/i, /^Cogeco/i,
  /^Sogetel/i, /^Coop ?Tel/i, /Maskatel/i, /T[eé]l[eé]phone/i];

export interface PrefixResult {
  npaNxx: string;
  originalCompany: string | null;
  class: PrefixClass;
  source: string;
  fileDate: string;
  evidence: "original_assignment_only";
  portabilityCaveat: true;
}

const d = data as { companies: string[]; prefixes: Record<string, number>; source: string; file_date: string };

export function classifyCompany(company: string | null): PrefixClass {
  if (!company) return "prefix_unassigned_or_special";
  if (MOBILE.some((r) => r.test(company))) return "prefix_mobile_probable";
  if (LANDLINE.some((r) => r.test(company))) return "prefix_landline_probable";
  return "prefix_voip_or_unknown";
}

export function classifyPrefix(phone: string): PrefixResult {
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const npaNxx = digits.slice(0, 6);
  const i = d.prefixes[npaNxx];
  const company = i === undefined ? null : d.companies[i];
  return { npaNxx, originalCompany: company, class: classifyCompany(company), source: d.source, fileDate: d.file_date, evidence: "original_assignment_only", portabilityCaveat: true };
}

export interface SmsSignals {
  humanReviewedCasl: boolean;
  optedOut: boolean;
  refusalPublished?: boolean;
}

/** Prefix never grants dispatch. Only human-reviewed CASL + no opt-out may (and gate still applies server-side). */
export function smsDispatchAllowedByEvidence(s: SmsSignals): boolean {
  return s.humanReviewedCasl && !s.optedOut && !s.refusalPublished;
}

/** Review priority only (higher = review first). */
export function reviewPriority(p: PrefixClass, deliveredOutreach: boolean): number {
  const base = { prefix_mobile_probable: 30, prefix_voip_or_unknown: 15, prefix_landline_probable: 0, prefix_unassigned_or_special: -10 }[p];
  return base + (deliveredOutreach ? 20 : 0);
}
