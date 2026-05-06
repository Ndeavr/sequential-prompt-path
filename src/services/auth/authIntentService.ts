/**
 * UNPRO — Auth Intent Preservation Service
 * Saves/restores user context across auth redirects.
 * Persists in BOTH sessionStorage (per-tab) and localStorage (cross-tab, 15-min TTL)
 * so magic-link/OAuth callbacks landing in a fresh tab still recover the return path.
 */

const INTENT_KEY = "unpro_auth_intent";
const TTL_MS = 15 * 60 * 1000; // 15 min

export interface AuthIntent {
  returnPath: string;
  action?: string;
  roleHint?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

function writeBoth(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* noop */ }
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function readEither(key: string): string | null {
  try {
    const s = sessionStorage.getItem(key);
    if (s) return s;
  } catch { /* noop */ }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearBoth(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

/** Save intent before redirecting to auth */
export function saveAuthIntent(intent: Omit<AuthIntent, "timestamp">) {
  const data: AuthIntent = { ...intent, timestamp: Date.now() };
  writeBoth(INTENT_KEY, JSON.stringify(data));
}

/** Snapshot the current route (path + search + hash) as the return target. */
export function captureCurrentRouteAsIntent(action?: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname + window.location.search + window.location.hash;
  // Don't capture auth-related routes as the return target
  if (/^\/(login|signup|auth\/callback|role|start)\b/.test(window.location.pathname)) return;
  saveAuthIntent({ returnPath: path, action });
}

/** Restore and clear intent after auth */
export function consumeAuthIntent(): AuthIntent | null {
  const raw = readEither(INTENT_KEY);
  if (!raw) return null;
  clearBoth(INTENT_KEY);
  try {
    const intent: AuthIntent = JSON.parse(raw);
    if (Date.now() - intent.timestamp > TTL_MS) return null;
    return intent;
  } catch {
    return null;
  }
}

/** Get intent without consuming */
export function peekAuthIntent(): AuthIntent | null {
  const raw = readEither(INTENT_KEY);
  if (!raw) return null;
  try {
    const intent: AuthIntent = JSON.parse(raw);
    if (Date.now() - intent.timestamp > TTL_MS) return null;
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
    case "partner":
      return "/partenaire/dashboard";
    case "homeowner":
      return "/dashboard";
    default:
      return "/onboarding";
  }
}
