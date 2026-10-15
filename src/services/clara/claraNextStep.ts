import { getClaraQualification, flushClaraQualification } from "./claraContractorQualification";
import { getMatchingSessionKey } from "@/lib/matching/sessionKey";
import { peekClaraSessionToken } from "./claraSession";
import { openClaraDestination } from "./claraNavigation";

/** No prose from a model is a receipt for a human callback. */
export function promisesDeferredFollowup(text: string): boolean {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").toLowerCase();
  if (/\bne\b.{0,35}\b(recontact|rappel|contacter)/.test(value) || /\b(recontact\w*|rappel\w*|contacter\w*)\s+(pas|jamais)\b/.test(value) || /\b(rappelle|rappelons)\s+que\b/.test(value)) return false;
  return /\b(je|nous|on|notre equipe|l equipe|quelqu un)\b.{0,65}\b(recontact\w*|rappel\w*|reviendr\w* vers vous|revenir vers vous|contacter\w*)/.test(value)
    || /\b(vous serez|vous seriez|quelqu un va vous)\s+(recontact\w*|rappele\w*|contacte\w*)/.test(value)
    || /\b(we|i|our team)\b.{0,35}\b(get back to you|contact you|call you back|be in touch)/.test(value);
}

export const CLARA_NEXT_STEP_TEXT = "Je reprends avec vous maintenant. Voici les informations déjà recueillies; complétez uniquement ce qui manque pour voir votre proposition.";

/** One explicitly transcribed value only; ranges and abbreviated amounts need clarification. */
export function declaredVoiceNumber(text: string): number | null {
  if (/\d\s*[kKmM]\b/.test(text)) return null;
  const numbers = text.match(/\d(?:[\d\s\u00a0]*\d)?(?:[.,]\d+)?/g);
  if (numbers?.length !== 1) return null;
  const value = Number(numbers[0].replace(/[\s\u00a0]/g, "").replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Existing draft + declared in-chat answers; no invented goals or quote price. */
export function prepareClaraPricingDraft(): void {
  const known = getClaraQualification();
  const key = `unpro_pricing_intake_draft:${getMatchingSessionKey()}`;
  const draft = JSON.parse(localStorage.getItem(key) || "{}");
  const flow = JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow") || "{}");
  const currentFlow = flow.session_token === peekClaraSessionToken() && flow.session_token;
  const data = { ...(draft.data ?? {}) };
  const put = (field: string, value: unknown) => { if (data[field] == null && value != null && value !== "") data[field] = value; };
  put("company_name", known.business_name);
  put("trade_primary", known.primary_trade);
  put("city", known.business_city || known.service_areas?.[0]);
  put("website_url", known.website);
  if (currentFlow) {
    for (const [source, target] of [["appointments", "monthly_capacity"], ["appointments", "next_month_appointments"], ["appointments", "target_monthly_appointments"], ["avg_value", "average_project_value"], ["avg_value", "avg_sale"]]) {
      if (typeof flow[source] === "number" && Number.isFinite(flow[source]) && flow[source] > 0) put(target, flow[source]);
    }
  }
  const confirmed = !!(data.company_name && data.trade_primary && data.city);
  localStorage.setItem(key, JSON.stringify({ ...draft, data, businessConfirmed: draft.businessConfirmed || confirmed, step: confirmed ? Math.max(1, draft.step || 0) : draft.step || 0 }));
}

export async function openClaraPricingNextStep(navigate: Parameters<typeof openClaraDestination>[0]) {
  await flushClaraQualification();
  prepareClaraPricingDraft();
  return openClaraDestination(navigate, { path: "/entrepreneur/devis-personnalise?view=personalized&from=clara", spoken: CLARA_NEXT_STEP_TEXT, mountSelector: "input" }, { intent: "contractor_onboarding" });
}
