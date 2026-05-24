/**
 * Painting calculator — sessionStorage persistence (decision: no anonymous DB draft).
 */
import type { CalculatorSessionData } from "./types";

const KEY = "unpro_painting_calc_session_v1";

export function loadSession(): CalculatorSessionData | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalculatorSessionData) : null;
  } catch {
    return null;
  }
}

export function saveSession(data: CalculatorSessionData) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors silently
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function getGuestSessionId(): string {
  const k = "unpro_painting_guest_id";
  let v = sessionStorage.getItem(k);
  if (!v) {
    v = `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    sessionStorage.setItem(k, v);
  }
  return v;
}
