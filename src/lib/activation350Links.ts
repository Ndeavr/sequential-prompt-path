import { ATTRIBUTION_PARAMS } from "@/config/contractorFunnel";

/** Code affilié normalisé (lettres, chiffres, tirets), sinon null. */
export function normalizeRef(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9-]{2,64}$/.test(v) ? v : null;
}

/** Liens sortants de /entrepreneurs/activation-350, attribution conservée. */
export function buildActivation350Links(sp: URLSearchParams) {
  const carry = new URLSearchParams();
  for (const k of ATTRIBUTION_PARAMS) {
    const v = sp.get(k);
    if (v && k !== "ref") carry.set(k, v);
  }
  const ref = normalizeRef(sp.get("ref"));
  if (ref) carry.set("ref", ref);
  const audit = new URLSearchParams(carry);
  const activate = new URLSearchParams(carry);
  activate.set("from", "activation_350");
  // Activation de base : récapitulatif court sur la page elle-même, jamais le
  // questionnaire mensuel (objectifs/marges/capacité) réservé à l'option RDV.
  activate.set("activate", "1");
  // Option rendez-vous : même parcours existant, ouvert sur la vue personnalisée
  // (prix et volume calculés par le serveur, consentement séparé).
  const more = new URLSearchParams(carry);
  more.set("from", "activation_350_more");
  more.set("view", "personalized");
  return {
    activate: `/entrepreneurs/activation-350?${activate}`,
    more: `/entrepreneur/devis-personnalise?${more}`,
    audit: `/entrepreneurs/audit-ia${audit.toString() ? `?${audit}` : ""}`,
  };
}
