/**
 * UNPRO — Lead Consent Helpers
 * Single source of truth: a lead is contactable only with valid explicit consent.
 */
export const VALID_CONSENT_STATUSES = [
  "verbal_permission",
  "written_permission",
  "web_form_opt_in",
  "existing_business_relationship",
] as const;

export type ConsentStatus =
  | "unknown"
  | "permission_required"
  | "verbal_permission"
  | "written_permission"
  | "web_form_opt_in"
  | "existing_business_relationship"
  | "opted_out"
  | "do_not_contact";

export interface LeadLike {
  consent_status?: string | null;
  opt_out_at?: string | null;
}

export function hasValidConsent(lead: LeadLike | null | undefined): boolean {
  if (!lead) return false;
  if (lead.opt_out_at) return false;
  return VALID_CONSENT_STATUSES.includes(lead.consent_status as any);
}

export function consentTone(
  lead: LeadLike | null | undefined,
): "red" | "yellow" | "green" | "black" {
  if (!lead) return "red";
  if (lead.consent_status === "do_not_contact" || lead.opt_out_at) return "black";
  if (hasValidConsent(lead)) return "green";
  if (lead.consent_status === "unknown") return "yellow";
  return "red";
}

export const CONSENT_LABELS: Record<string, string> = {
  unknown: "À vérifier",
  permission_required: "Permission requise",
  verbal_permission: "Permission verbale",
  written_permission: "Permission écrite",
  web_form_opt_in: "Opt-in formulaire web",
  existing_business_relationship: "Relation d'affaires existante",
  opted_out: "Désinscrit",
  do_not_contact: "Ne pas contacter",
};

export const LEAD_STATUS_PIPELINE = [
  { key: "new_prospect", label: "Nouveau prospect" },
  { key: "permission_required", label: "Permission à obtenir" },
  { key: "contact_authorized", label: "Contact autorisé" },
  { key: "contacted", label: "Contacté" },
  { key: "to_call_back", label: "À rappeler" },
  { key: "interested", label: "Intéressé" },
  { key: "demo_scheduled", label: "Démo planifiée" },
  { key: "onboarding", label: "En onboarding" },
  { key: "payment_pending", label: "Paiement en attente" },
  { key: "active", label: "Actif" },
  { key: "refused", label: "Refusé" },
  { key: "lost", label: "Perdu" },
  { key: "do_not_contact", label: "Ne pas contacter" },
] as const;
