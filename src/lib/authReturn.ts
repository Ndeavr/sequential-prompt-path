/**
 * UNPRO — AuthReturnManager
 * Centralized post-login destination resolver.
 * Stores intended path before /login and computes a safe destination after auth.
 */

const RETURN_KEY = "unpro_return_to";
const CONTEXT_KEY = "unpro_return_context";
const ALEX_FLOW_KEY = "unpro_alex_active_flow";
const ALEX_INTENT_KEY = "unpro_pending_alex_intent";
const CONTRACTOR_STEP_KEY = "unpro_contractor_onboarding_step";
const SESSION_INTENT_KEY = "unpro_pending_intent_path";

const UNSAFE_PREFIXES = ["/login", "/auth", "/auth/callback", "/logout", "/signup"];

export type ReturnSource =
  | "protected_route"
  | "alex"
  | "contractor_onboarding"
  | "admin"
  | "checkout"
  | "manual";

export interface ReturnContext {
  source: ReturnSource;
  timestamp: number;
}

function safeGet(storage: Storage | null, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}
function safeSet(storage: Storage | null, key: string, value: string) {
  try { storage?.setItem(key, value); } catch { /* noop */ }
}
function safeRemove(storage: Storage | null, key: string) {
  try { storage?.removeItem(key); } catch { /* noop */ }
}

export function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false; // internal only
  if (path.startsWith("//")) return false; // protocol-relative
  return !UNSAFE_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));
}

export function saveReturnPath(path: string, source: ReturnSource = "protected_route") {
  if (typeof window === "undefined") return;
  if (!isSafeReturnPath(path)) return;
  safeSet(window.localStorage, RETURN_KEY, path);
  safeSet(window.localStorage, CONTEXT_KEY, JSON.stringify({ source, timestamp: Date.now() } as ReturnContext));
}

export function captureCurrentAsReturn(source: ReturnSource = "protected_route") {
  if (typeof window === "undefined") return;
  const path = window.location.pathname + window.location.search + window.location.hash;
  saveReturnPath(path, source);
}

export function clearReturnPath() {
  if (typeof window === "undefined") return;
  safeRemove(window.localStorage, RETURN_KEY);
  safeRemove(window.localStorage, CONTEXT_KEY);
}

export function readReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const v = safeGet(window.localStorage, RETURN_KEY);
  return isSafeReturnPath(v) ? v : null;
}

function readQueryReturn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("returnTo") || params.get("redirect") || params.get("return_to");
    return isSafeReturnPath(v) ? v : null;
  } catch { return null; }
}

export interface ResolveOptions {
  role?: string | null;
  isAdmin?: boolean;
}

/**
 * Compute the post-login destination using fallback priority:
 * 1. ?returnTo= query param
 * 2. localStorage unpro_return_to
 * 3. sessionStorage unpro_pending_intent_path
 * 4. Alex active flow / pending intent → /?alex=resume
 * 5. Contractor onboarding step → /entrepreneur/onboarding
 * 6. Role-based default
 */
export function resolveReturnDestination(opts: ResolveOptions = {}): string {
  if (typeof window === "undefined") return "/dashboard";
  const role = opts.role ?? null;
  const isAdmin = opts.isAdmin ?? role === "admin";

  // 1. Query param
  const q = readQueryReturn();
  if (q) {
    if (q.startsWith("/admin") && !isAdmin) return roleDefault(role);
    return q;
  }

  // 2. localStorage return
  const stored = readReturnPath();
  if (stored) {
    if (stored.startsWith("/admin") && !isAdmin) return roleDefault(role);
    return stored;
  }

  // 3. sessionStorage pending intent
  const sessionIntent = safeGet(window.sessionStorage, SESSION_INTENT_KEY);
  if (isSafeReturnPath(sessionIntent)) return sessionIntent;

  // 4. Alex
  const alexFlow = safeGet(window.localStorage, ALEX_FLOW_KEY) || safeGet(window.localStorage, ALEX_INTENT_KEY);
  if (alexFlow) return "/?alex=resume";

  // 5. Contractor onboarding
  const contractorStep = safeGet(window.localStorage, CONTRACTOR_STEP_KEY);
  if (contractorStep) return "/entrepreneur/onboarding";

  // 6. Role default
  return roleDefault(role);
}

function roleDefault(role: string | null): string {
  switch (role) {
    case "admin": return "/admin";
    case "contractor": return "/pro";
    case "condo_manager": return "/condo";
    case "homeowner": return "/dashboard";
    default: return "/dashboard";
  }
}

export const AUTH_RETURN_KEYS = {
  RETURN_KEY,
  CONTEXT_KEY,
  ALEX_FLOW_KEY,
  CONTRACTOR_STEP_KEY,
  SESSION_INTENT_KEY,
};
