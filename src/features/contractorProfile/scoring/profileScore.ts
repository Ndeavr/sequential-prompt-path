/**
 * UNPRO — Contractor profile scoring gate (0–100).
 * Publish requires total ≥ 90.
 */
import { FAQ_MINIMUM, MEDIA_MINIMUM, PUBLISH_SCORE_MINIMUM, type ContractorPageInput } from "../generator/pageTypes";
import { countVerifiedAssets } from "../media/mediaContract";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

export interface ProfileScore {
  visibility: number; // /25
  trust: number;      // /25
  aeo: number;        // /25
  conversion: number; // /25
  total: number;      // /100
  passesPublishGate: boolean;
  breakdown: string[];
}

export function computeProfileScore(input: ContractorPageInput): ProfileScore {
  const breakdown: string[] = [];

  // Visibility
  let visibility = 0;
  if (normalizeImageUrl(input.logo.url) && input.logo.verified) visibility += 10;
  else breakdown.push("visibility: logo missing or unverified");
  const verifiedImages = countVerifiedAssets(input.gallery);
  if (verifiedImages >= MEDIA_MINIMUM) visibility += 10;
  else breakdown.push(`visibility: only ${verifiedImages}/${MEDIA_MINIMUM} images`);
  if (input.ctas.book_appointment) visibility += 5;
  else breakdown.push("visibility: primary CTA missing");

  // Trust
  let trust = 0;
  if (input.business_name.length >= 2) trust += 5;
  if (input.service_area.length >= 1) trust += 5;
  if (input.hero.phone.replace(/\D/g, "").length >= 10) trust += 5;
  else breakdown.push("trust: phone missing/invalid");
  if (input.hero.website) trust += 5;
  else breakdown.push("trust: website missing");
  if (input.rating && input.rating.count > 0) trust += 5;
  else breakdown.push("trust: no reviews");

  // AEO
  let aeo = 0;
  if (input.faqs.length >= FAQ_MINIMUM) aeo += 10;
  else breakdown.push(`aeo: only ${input.faqs.length}/${FAQ_MINIMUM} FAQs`);
  if (input.service_types.length >= 1) aeo += 5;
  if (input.service_area.length >= 1) aeo += 5;
  if (input.canonical_url && input.slug) aeo += 5;

  // Conversion
  let conversion = 0;
  if (input.ctas.book_appointment) conversion += 10;
  if (input.ctas.alex) conversion += 8;
  else breakdown.push("conversion: Alex CTA missing");
  if (input.ctas.evaluation) conversion += 7;
  else breakdown.push("conversion: evaluation CTA missing");

  const total = visibility + trust + aeo + conversion;
  return {
    visibility,
    trust,
    aeo,
    conversion,
    total,
    passesPublishGate: total >= PUBLISH_SCORE_MINIMUM,
    breakdown,
  };
}
