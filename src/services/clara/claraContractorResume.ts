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

/**
 * Retour au projet maison : le parcours entrepreneur est SUSPENDU, jamais
 * effacé. Entreprise, objectifs et réponses déjà données restent disponibles.
 */
export function pauseActiveContractorFlow(): void {
  try {
    const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || "{}");
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({ ...flow, active: false }));
  } catch { /* rien à suspendre */ }
}

// Curseur propriétaire : dernière question maison sans réponse, par conversation.
const HOME_CURSOR_KEY = "unpro_clara_home_cursor";
export interface ClaraHomeCursor { text: string; options: string[] }

export function rememberHomeCursor(cursor: ClaraHomeCursor | null): void {
  try {
    if (!cursor) { sessionStorage.removeItem(HOME_CURSOR_KEY); return; }
    sessionStorage.setItem(HOME_CURSOR_KEY, JSON.stringify({ ...cursor, session_token: peekClaraSessionToken() }));
  } catch { /* le fil reste la source visible */ }
}

export function readHomeCursor(): ClaraHomeCursor | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(HOME_CURSOR_KEY) || "null");
    if (!raw || typeof raw.text !== "string" || raw.session_token !== peekClaraSessionToken()) return null;
    return { text: raw.text, options: Array.isArray(raw.options) ? raw.options : [] };
  } catch { return null; }
}
