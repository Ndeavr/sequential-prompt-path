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
  return {
    activate: `/entrepreneur/devis-personnalise?${activate}`,
    audit: `/entrepreneurs/audit-ia${audit.size ? `?${audit}` : ""}`,
  };
}
