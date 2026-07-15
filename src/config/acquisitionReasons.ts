/**
 * Canonical rejection / event reason codes for the acquisition pipeline.
 * Keep in sync with supabase/functions/_shared/acquisitionReasons.ts
 */
export const ACQUISITION_REASONS: Record<string, string> = {
  phone_invalid: "Numéro invalide",
  phone_missing: "Aucun téléphone trouvé",
  email_missing: "Aucun email trouvé",
  quality_below_80: "Score qualité < 80",
  duplicate_neq: "Doublon (NEQ)",
  duplicate_phone: "Doublon (téléphone)",
  duplicate_business: "Doublon (nom d'entreprise)",
  outside_target_zone: "Hors zone cible",
  category_unknown: "Catégorie inconnue",
  enrichment_failed: "Enrichissement échoué",
  website_unreachable: "Site web inaccessible",
  sms_not_eligible: "SMS non éligible",
  landline_only: "Ligne fixe uniquement",
  no_contact_info: "Aucune coordonnée",
  timeout: "Timeout",
  unknown: "Raison inconnue",
};

export const PIPELINE_STAGES = [
  "scraped",
  "enriching",
  "enriched",
  "verified",
  "ready_sms",
  "ready_email",
  "contacted",
  "delivered",
  "clicked",
  "activated",
  "rejected",
  "duplicate",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_SOURCES = [
  "google_business",
  "rbq",
  "website",
  "facebook",
  "manual",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  google_business: "Google Business",
  rbq: "Registre RBQ",
  website: "Sites web",
  facebook: "Facebook",
  manual: "Import manuel",
  unknown: "Inconnu",
};

export const STAGE_LABELS: Record<string, string> = {
  scraped: "Trouvée",
  enriching: "Enrichissement",
  enriched: "Enrichie",
  verified: "Validée",
  ready_sms: "Prête SMS",
  ready_email: "Prête Email",
  contacted: "Contactée",
  delivered: "Livrée",
  clicked: "Cliquée",
  activated: "Activée 1$",
  rejected: "Rejetée",
  duplicate: "Doublon",
};

export const STAGE_COLORS: Record<string, string> = {
  scraped: "text-slate-300",
  enriching: "text-blue-300",
  enriched: "text-blue-400",
  verified: "text-emerald-400",
  ready_sms: "text-amber-400",
  ready_email: "text-amber-300",
  contacted: "text-cyan-400",
  delivered: "text-cyan-300",
  clicked: "text-violet-300",
  activated: "text-emerald-300 font-bold",
  rejected: "text-rose-400",
  duplicate: "text-slate-500",
};
