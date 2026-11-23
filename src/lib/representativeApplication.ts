/**
 * Candidature « Représenter UNPRO » (/carrieres/representants-construction).
 * Validation partagée côté client; le serveur (submit-representative-application) revalide tout.
 */
export const REP_FR_PATH = "/carrieres/representants-construction";
export const REP_EN_PATH = "/en/careers/construction-sales-representatives";
export const REP_FR_URL = `https://unpro.ca${REP_FR_PATH}`;
export const REP_EN_URL = `https://unpro.ca${REP_EN_PATH}`;

export type RepExperience = "construction" | "sales" | "both" | "other";

export interface RepForm {
  full_name: string;
  email: string;
  phone: string;
  region: string;
  experience: RepExperience | "";
  wants_team_lead: boolean;
  terms_acknowledged: boolean;
  follow_up_consent: boolean;
}

export const EMPTY_REP_FORM: RepForm = {
  full_name: "", email: "", phone: "", region: "", experience: "",
  wants_team_lead: false, terms_acknowledged: false, follow_up_consent: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{10,20}$/;

export function validateRepForm(f: RepForm, fr = true): Record<string, string> {
  const t = (a: string, b: string) => (fr ? a : b);
  const e: Record<string, string> = {};
  const name = f.full_name.trim();
  if (name.length < 2 || name.length > 120) e.full_name = t("Indiquez votre nom complet.", "Enter your full name.");
  if (!EMAIL_RE.test(f.email.trim()) || f.email.trim().length > 255) e.email = t("Courriel invalide.", "Invalid email.");
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) e.phone = t("Numéro de téléphone invalide.", "Invalid phone number.");
  if (f.region.trim().length < 2 || f.region.trim().length > 120) e.region = t("Indiquez votre région.", "Enter your region.");
  if (!f.experience) e.experience = t("Choisissez votre expérience.", "Choose your experience.");
  if (!f.terms_acknowledged) e.terms_acknowledged = t("Confirmez avoir lu le statut et la rémunération.", "Confirm you have read the status and pay terms.");
  if (!f.follow_up_consent) e.follow_up_consent = t("Votre accord est requis pour que nous puissions vous répondre.", "Your consent is required so we can reply.");
  return e;
}

export function splitName(full: string): { first_name: string; last_name: string | null } {
  const parts = full.trim().replace(/\s+/g, " ").split(" ");
  const first_name = parts.shift() ?? "";
  return { first_name, last_name: parts.length ? parts.join(" ") : null };
}

export function toRepPayload(f: RepForm) {
  return {
    ...splitName(f.full_name),
    email: f.email.trim().toLowerCase(),
    phone: f.phone.trim() || null,
    region: f.region.trim(),
    experience: f.experience as RepExperience,
    wants_team_lead: f.wants_team_lead,
    terms_acknowledged: f.terms_acknowledged === true,
    follow_up_consent: f.follow_up_consent === true,
  };
}

/** Lien entrepreneur : réutilise l'entrée canonique existante, avec provenance sans PII. */
export function contractorEntryHref(entryPath: string): string {
  return `${entryPath}?from=carrieres-representants`;
}
