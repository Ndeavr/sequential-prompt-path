import { CONTRACTOR_MARKETING_FIELDS } from "@/lib/analytics/contractorAdTracking";

/** URL selects public project data only, never a role, instruction or entitlement. */
export const HEAT_PUMP_CAMPAIGN = {
  intent: "thermopompe",
  greeting: "Bonjour! Vous souhaitez vous informer sur les thermopompes? Je peux vous aider à comprendre les options et les subventions possibles. Qu’aimeriez-vous explorer?",
  choices: ["Les subventions possibles", "Une thermopompe centrale", "Une thermopompe murale", "Remplacer mon système actuel"],
  context: "Projet propriétaire déclaré : thermopompe (chauffage/climatisation). Explorer les options et les subventions possibles, sans admissibilité ni montant confirmé. Les réponses antérieures et la propriété restent disponibles; ce projet n'est pas une inscription entrepreneur.",
} as const;

export function readHomeCampaign(search: string, path: string) {
  if (path !== "/" && path !== "/index") return null;
  const params = new URLSearchParams(search);
  return params.getAll("intent").length === 1 && params.get("intent") === HEAT_PUMP_CAMPAIGN.intent
    ? HEAT_PUMP_CAMPAIGN : null;
}

export function homeCampaignAttribution(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(CONTRACTOR_MARKETING_FIELDS.flatMap(key => {
    const value = params.get(key)?.trim();
    return value && /^[\p{L}\p{N}_. -]{1,120}$/u.test(value) ? [[key, value]] : [];
  }));
}

/** The same public context is consumed by alex-chat's existing currentPage field. */
export function homeCampaignContext(active: boolean, pageContext: string): string {
  return active ? `${HEAT_PUMP_CAMPAIGN.context}\n${pageContext}` : pageContext;
}

export function hasHeatPumpCampaign(workflow: { sub_workflow?: string | null } | null | undefined): boolean {
  return workflow?.sub_workflow === HEAT_PUMP_CAMPAIGN.intent;
}