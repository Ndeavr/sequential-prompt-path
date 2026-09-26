/**
 * UNPRO — Contexte entrepreneur déjà connu (côté client).
 *
 * Regroupe uniquement des informations que l'entrepreneur a lui-même déclarées
 * ou qu'une source a réellement fournies pendant le parcours : qualification
 * Clara, brouillon du devis personnalisé, état du tunnel d'activation.
 * Rien n'est inventé ni déduit.
 */
import { getClaraQualification } from "@/services/clara/claraContractorQualification";

export type KnownContractorContext = {
  businessName: string | null;
  trade: string | null;
  city: string | null;
};

const EMPTY: KnownContractorContext = { businessName: null, trade: null, city: null };

function clean(v: unknown): string | null {
  return typeof v === "string" && v.trim().length >= 2 ? v.trim() : null;
}

function fromPricingDraft(): Partial<KnownContractorContext> {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("unpro_pricing_intake_draft:")) continue;
      const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as {
        data?: { company_name?: string; trade_primary?: string; city?: string };
      };
      const d = parsed.data;
      if (!d) continue;
      return { businessName: clean(d.company_name), trade: clean(d.trade_primary), city: clean(d.city) };
    }
  } catch {
    /* stockage indisponible */
  }
  return {};
}

function fromFunnel(): Partial<KnownContractorContext> {
  try {
    const raw = sessionStorage.getItem("unpro_contractor_funnel");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { businessName?: string; city?: string };
    return { businessName: clean(parsed.businessName), city: clean(parsed.city) };
  } catch {
    return {};
  }
}

export function getKnownContractorContext(): KnownContractorContext {
  if (typeof window === "undefined") return EMPTY;
  const clara = getClaraQualification();
  const draft = fromPricingDraft();
  const funnel = fromFunnel();

  return {
    businessName: clean(clara.business_name) ?? draft.businessName ?? funnel.businessName ?? null,
    trade: clean(clara.primary_trade) ?? draft.trade ?? null,
    city:
      clean(clara.business_city) ??
      clean(clara.service_areas?.[0]) ??
      draft.city ??
      funnel.city ??
      null,
  };
}
