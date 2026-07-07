/**
 * UNPRO — Contractor page validator.
 * Runs before publish. Any failed check → status='draft'.
 */
import {
  ContractorPageSchema,
  FAQ_MINIMUM,
  MEDIA_MINIMUM,
  type ContractorPageInput,
} from "../generator/pageTypes";
import { auditPageLanguage } from "../lang/detectPageLanguage";
import { computeProfileScore, type ProfileScore } from "../scoring/profileScore";
import { countVerifiedAssets } from "../media/mediaContract";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import {
  isBlockedContractorAlias,
  normalizeContractorName,
} from "@/lib/brand/canonicalContractor";

export type ValidationCheck =
  | "schema"
  | "logo"
  | "hero"
  | "gallery"
  | "description"
  | "faq"
  | "schema_jsonld"
  | "cta"
  | "canonical"
  | "language"
  | "images"
  | "brand_canonical";

export interface ValidationResult {
  ok: boolean;
  failed: ValidationCheck[];
  reasons: Record<string, string>;
  score: ProfileScore;
  publishable: boolean;
  languageMismatches: ReturnType<typeof auditPageLanguage>["mismatches"];
}

export function validatePublicPage(raw: unknown): ValidationResult {
  const failed: ValidationCheck[] = [];
  const reasons: Record<string, string> = {};

  // Schema
  const parsed = ContractorPageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      failed: ["schema"],
      reasons: { schema: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ") },
      score: { visibility: 0, trust: 0, aeo: 0, conversion: 0, total: 0, passesPublishGate: false, breakdown: ["invalid schema"] },
      publishable: false,
      languageMismatches: [],
    };
  }
  const input: ContractorPageInput = parsed.data;

  // Logo (LogoResolver always renders something, but validator still flags missing verified logo)
  if (!normalizeImageUrl(input.logo.url) || !input.logo.verified) {
    // Non-fatal: monogram fallback will render. Only fail if monogram initials also unusable.
    if (!input.logo.monogram?.initials) {
      failed.push("logo");
      reasons.logo = "no verified logo and no monogram initials";
    }
  }

  // Hero
  if (!input.hero.tagline || !input.hero.phone || input.hero.territories.length === 0) {
    failed.push("hero");
    reasons.hero = "missing tagline / phone / territories";
  }

  // Gallery
  const verified = countVerifiedAssets(input.gallery);
  if (verified < MEDIA_MINIMUM) {
    failed.push("gallery");
    reasons.gallery = `${verified}/${MEDIA_MINIMUM} verified images`;
  }

  // Description
  if (input.description.trim().length < 120) {
    failed.push("description");
    reasons.description = "description under 120 chars";
  }

  // FAQ
  if (input.faqs.length < FAQ_MINIMUM) {
    failed.push("faq");
    reasons.faq = `${input.faqs.length}/${FAQ_MINIMUM} FAQs`;
  }

  // CTAs
  if (!input.ctas.book_appointment || !input.ctas.alex || !input.ctas.evaluation) {
    failed.push("cta");
    reasons.cta = "one or more CTAs missing";
  }

  // Canonical
  if (!input.canonical_url || !input.slug) {
    failed.push("canonical");
    reasons.canonical = "canonical url or slug missing";
  }

  // Language
  const langAudit = auditPageLanguage(input.language, {
    tagline: input.hero.tagline,
    description: input.description,
    faq: input.faqs.map((f) => `${f.question} ${f.answer}`).join(" "),
    cta: `${input.ctas.book_appointment} ${input.ctas.alex} ${input.ctas.evaluation}`,
  });
  if (!langAudit.ok) {
    failed.push("language");
    reasons.language = langAudit.mismatches.map((m) => `${m.block}→${m.detected}`).join(", ");
  }

  // Brand canonical
  const normalizedName = normalizeContractorName(input.business_name);
  if (isBlockedContractorAlias(input.business_name) && normalizedName !== input.business_name) {
    failed.push("brand_canonical");
    reasons.brand_canonical = `business_name should be "${normalizedName}"`;
  }

  // Images (any placeholder token / broken URL)
  const brokenImages = input.gallery.filter((a) => !normalizeImageUrl(a.url) && a.url !== "");
  if (brokenImages.length > 0) {
    failed.push("images");
    reasons.images = `${brokenImages.length} broken image URLs`;
  }

  const score = computeProfileScore(input);
  const ok = failed.length === 0;
  return {
    ok,
    failed,
    reasons,
    score,
    publishable: ok && score.passesPublishGate,
    languageMismatches: langAudit.mismatches,
  };
}
