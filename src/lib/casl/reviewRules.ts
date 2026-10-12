/**
 * Shared CASL review rules (client mirror of DB trigger `casl_evidence_human_review_guard`).
 * The server trigger is authoritative; this only explains to the admin why a button is disabled.
 */
export type ReviewBucket = "a_traiter" | "preuve_potentielle" | "source_tierce" | "exclu" | "admissible_sur_preuve";

export interface EvidenceLike {
  source_type: string | null;
  source_url: string | null;
  lawful_basis: string | null;
  refusal_statement_found: boolean | null;
  reviewer_id: string | null;
  is_valid: boolean;
}

export const MIN_NOTE = 30;

export const isFirstParty = (e: Pick<EvidenceLike, "source_type">) => e.source_type === "company_website";

export function approvalBlocker(e: EvidenceLike, opts: { optedOut: boolean }): string | null {
  if (e.reviewer_id) return "Déjà décidé";
  if (!e.is_valid) return "Preuve invalidée";
  if (opts.optedOut) return "Opposition STOP enregistrée";
  if (e.refusal_statement_found) return "Refus de sollicitation publié";
  if (!e.source_url || !/^https:\/\//i.test(e.source_url)) return "Lien source HTTPS manquant";
  if (e.lawful_basis === "implicit_public_conspicuous" && !isFirstParty(e))
    return "Source tierce (annuaire, Google, registre) : elle identifie l'entreprise mais ne prouve pas une publication par l'entreprise elle-même";
  return null;
}

export function bucketOf(e: EvidenceLike, opts: { optedOut: boolean }): ReviewBucket {
  if (!e.is_valid || opts.optedOut || e.refusal_statement_found) return "exclu";
  if (e.reviewer_id) return "admissible_sur_preuve";
  if (!isFirstParty(e)) return "source_tierce";
  return "preuve_potentielle";
}

export const BUCKET_LABEL: Record<ReviewBucket, string> = {
  a_traiter: "À traiter",
  preuve_potentielle: "Preuve potentielle",
  source_tierce: "Source tierce",
  exclu: "Exclu",
  admissible_sur_preuve: "Base légale signée",
};

/** Three distinct line states — never merged. */
export function lineStates(p: { prefixMobileProbable: boolean; deliveredBefore: boolean; verifiedRecently: boolean }) {
  return [
    p.verifiedRecently
      ? { key: "verified", label: "Mobile vérifié récemment", tip: "Vérification de type de ligne de moins de 90 jours" }
      : { key: "unverified", label: "Mobile non vérifié", tip: "Twilio Canada refuse la vérification (60601)" },
    p.prefixMobileProbable && { key: "inferred", label: "Mobile possible (déduit)", tip: "Déduit de l'indicatif d'origine; le numéro a pu être transféré" },
    p.deliveredBefore && { key: "history", label: "SMS livré auparavant", tip: "Une livraison passée ne donne pas le droit de recontacter" },
  ].filter(Boolean) as { key: string; label: string; tip: string }[];
}

export function validateDecision(note: string, sourceOpened: boolean, consultedOn: string): string | null {
  if (!sourceOpened) return "Confirmez avoir ouvert et examiné la source";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(consultedOn)) return "Date de consultation requise";
  if (note.trim().length < MIN_NOTE) return `Justification requise (${MIN_NOTE} caractères min.)`;
  return null;
}

export function paginate<T>(items: T[], page: number, size = 25) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(0, page), pages - 1);
  return { items: items.slice(p * size, p * size + size), page: p, pages };
}
