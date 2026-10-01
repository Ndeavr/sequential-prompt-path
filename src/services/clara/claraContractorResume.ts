import { getClaraSessionToken, peekClaraSessionToken } from "./claraSession";

// Extend the existing in-chat flow memory; never use a business profile as a
// signal that a new homeowner conversation belongs to a contractor.
const FLOW_KEY = "unpro_clara_contractor_flow";

export function hasActiveContractorFlow(): boolean {
  try {
    const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || "{}");
    return flow.active === true && flow.session_token === peekClaraSessionToken();
  } catch { return false; }
}

export function rememberActiveContractorFlow(active: boolean): void {
  try {
    if (!active) {
      sessionStorage.removeItem(FLOW_KEY);
      return;
    }
    const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || "{}");
    const token = getClaraSessionToken();
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      ...(flow.session_token === token ? flow : {}), active, session_token: token,
    }));
  } catch { /* The canonical server context remains available. */ }
}

export function isContractorContext(context: Record<string, unknown>): boolean {
  const intent = String(context.current_intent ?? "").toLowerCase();
  if (intent) return intent === "contractor" || intent === "contractor_onboarding";
  return String(context.detected_role ?? "").toLowerCase() === "contractor";
}
