/**
 * UNPRO — Auth Intent Preservation Service
 * Saves/restores user context across auth redirects.
 */

const INTENT_KEY = "unpro_auth_intent";

export interface AuthIntent {
  returnPath: string;
  action?: string;
  roleHint?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/** Save intent before redirecting to auth */
export function saveAuthIntent(intent: Omit<AuthIntent, "timestamp">) {
  const data: AuthIntent = { ...intent, timestamp: Date.now() };
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable
  }
}

/** Restore and clear intent after auth */
export function consumeAuthIntent(): AuthIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INTENT_KEY);
    const intent: AuthIntent = JSON.parse(raw);
    // Expire after 30 min
    if (Date.now() - intent.timestamp > 30 * 60 * 1000) return null;
    return intent;
  } catch {
    return null;
  }
}

/** Get intent without consuming */
export function peekAuthIntent(): AuthIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent: AuthIntent = JSON.parse(raw);
    if (Date.now() - intent.timestamp > 30 * 60 * 1000) return null;
    return intent;
  } catch {
    return null;
  }
}

/** Role-aware default redirect */
export function getDefaultRedirectForRole(role: string | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "contractor":
      return "/pro";
    case "homeowner":
      return "/dashboard";
    default:
      return "/onboarding";
  }
}
