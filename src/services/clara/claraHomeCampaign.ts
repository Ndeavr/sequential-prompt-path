import { CONTRACTOR_MARKETING_FIELDS } from "@/lib/analytics/contractorAdTracking";

/** URL selects public project data only, never a role, instruction or entitlement. */
export const HEAT_PUMP_CAMPAIGN = {
  intent: "thermopompe",
  greeting: "Bonjour! Vous souhaitez vous informer sur les thermopompes? Je peux vous aider à comprendre les options et les subventions possibles. Qu’aimeriez-vous explorer?",
  choices: ["Les subventions possibles", "Une thermopompe centrale", "Une thermopompe murale", "Remplacer mon système actuel"],
  context: "Projet propriétaire déclaré : thermopompe (chauffage/climatisation). Explorer les options et les subventions possibles, sans admissibilité ni montant confirmé. Les réponses antérieures et la propriété restent disponibles; ce projet n'est pas une inscription entrepreneur.",
} as const;

export const SAVINGS_CAMPAIGN = {
  intent: "economies-100m",
  greeting: "Bonjour! Vous venez découvrir comment UNPRO peut vous aider à trouver le bon pro sans courir après trois soumissions. Notre objectif : 100 millions $ d’économies partagées grâce à l’IA. Quel projet souhaitez-vous réaliser?",
  choices: ["Rénover ou construire", "Entretenir ma propriété", "Un besoin immobilier", "Comprendre les économies"],
  context: "Entrée propriétaire : campagne UNPRO objectif 100 millions $ d’économies partagées. Trouver le bon pro sans courir après trois soumissions. Le type de travaux n’est pas encore déclaré dans cette campagne : demander le projet, ne pas supposer une thermopompe à partir d’un ancien échange. Conserver les faits connus et confirmer leur pertinence pour ce projet. Expliquer le meilleur jumelage et les coûts évités; 100 millions est un objectif collectif, pas une économie individuelle acquise.",
} as const;

export type HomeCampaign = typeof HEAT_PUMP_CAMPAIGN | typeof SAVINGS_CAMPAIGN;
export function homeCampaignByIntent(intent: unknown): HomeCampaign | null {
  return intent === SAVINGS_CAMPAIGN.intent ? SAVINGS_CAMPAIGN : intent === HEAT_PUMP_CAMPAIGN.intent ? HEAT_PUMP_CAMPAIGN : null;
}

/** An explicit campaign always wins over a previous conversation's campaign. */
export function resolveHomeCampaign(entry: HomeCampaign | null, storedIntent: unknown, cursorIntent: unknown): HomeCampaign | null {
  return entry ?? homeCampaignByIntent(storedIntent) ?? homeCampaignByIntent(cursorIntent);
}

export function readHomeCampaign(search: string, path: string) {
  if (path !== "/" && path !== "/index") return null;
  const params = new URLSearchParams(search);
  return params.getAll("intent").length === 1 ? homeCampaignByIntent(params.get("intent")) : null;
}

export function homeCampaignAttribution(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(CONTRACTOR_MARKETING_FIELDS.flatMap(key => {
    const value = params.get(key)?.trim();
    return value && /^[\p{L}\p{N}_. -]{1,120}$/u.test(value) ? [[key, value]] : [];
  }));
}

export function sanitizeHomeCampaignAttribution(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const params = new URLSearchParams();
  for (const key of CONTRACTOR_MARKETING_FIELDS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string") params.set(key, value);
  }
  return homeCampaignAttribution(params.toString());
}

/** The same public context is consumed by alex-chat's existing currentPage field. */
export function homeCampaignContext(active: boolean | HomeCampaign | null, pageContext: string): string {
  const campaign = active === true ? HEAT_PUMP_CAMPAIGN : active || null;
  return campaign ? `${campaign.context}\n${pageContext}` : pageContext;
}

export function hasHeatPumpCampaign(workflow: { sub_workflow?: string | null } | null | undefined): boolean {
  return workflow?.sub_workflow === HEAT_PUMP_CAMPAIGN.intent;
}