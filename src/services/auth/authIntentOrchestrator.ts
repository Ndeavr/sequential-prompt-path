/**
 * UNPRO — Canonical post-auth intent orchestrator
 *
 * ONE place consumes and applies the pre-login role intent. `useAuthReturn`,
 * `AuthReturnRouter` and `AuthCallbackPage` all call this and only *read* the
 * result to route. It is de-duplicated per user id, so a double callback, a
 * refresh, or two listeners firing at once never apply the intent twice.
 *
 * Priority:
 *   1. server-side cross-device intent (opaque `?ri=` token from the magic link)
 *   2. local device intent (sessionStorage / localStorage)
 *
 * On failure nothing is cleared and nothing is routed to a homeowner default:
 * the caller must surface a recoverable error.
 */
import { applyRoleIntent, clearRoleIntent, readRoleIntent, type CanonicalRole } from "@/services/auth/roleIntent";
import {
  clearStashedIntentToken,
  consumeRoleIntentToken,
  readIntentTokenFromUrl,
  releaseRoleIntentToken,
  serverIntentToMeta,
} from "@/services/auth/crossDeviceRoleIntent";

export interface AuthIntentOutcome {
  /** Role that was requested (server or local intent), null when there was none. */
  role: CanonicalRole | null;
  /** True when a role intent existed AND was applied successfully. */
  applied: boolean;
  /** True when an intent existed but could not be applied — never route silently. */
  failed: boolean;
  returnPath: string | null;
  source: "server" | "local" | "none";
  error?: string;
}

const NO_INTENT: AuthIntentOutcome = {
  role: null, applied: false, failed: false, returnPath: null, source: "none",
};

const cache = new Map<string, Promise<AuthIntentOutcome>>();

export function resetAuthIntentCache() {
  cache.clear();
}

export function resolveAuthIntentOnce(user: { id: string; email?: string | null }): Promise<AuthIntentOutcome> {
  const existing = cache.get(user.id);
  if (existing) return existing;

  const run = (async (): Promise<AuthIntentOutcome> => {
    // 1) Cross-device server intent
    const token = readIntentTokenFromUrl();
    if (token) {
      const { intent, reason } = await consumeRoleIntentToken(token);
      if (intent) {
        const meta = serverIntentToMeta(intent);
        const result = await applyRoleIntent(user, meta);
        if (!result.applied) {
          // Put it back so the user can retry — never downgrade silently.
          await releaseRoleIntentToken(token);
          return {
            role: intent.role, applied: false, failed: true,
            returnPath: intent.returnPath, source: "server",
            error: result.error ?? "intent_application_failed",
          };
        }
        clearStashedIntentToken();
        clearRoleIntent();
        return {
          role: intent.role, applied: true, failed: false,
          returnPath: intent.returnPath, source: "server",
        };
      }
      // Expired / already consumed / email mismatch: fall through to the local
      // intent (same-device case) rather than failing the whole login.
      clearStashedIntentToken();
      if (reason && reason !== "intent_not_found" && !readRoleIntent()) {
        return { ...NO_INTENT, failed: true, source: "server", error: reason };
      }
    }

    // 2) Local device intent
    const local = readRoleIntent();
    if (!local) return NO_INTENT;

    const result = await applyRoleIntent(user, local);
    if (!result.applied) {
      return {
        role: local.role, applied: false, failed: true,
        returnPath: local.returnPath ?? null, source: "local",
        error: result.error ?? "intent_application_failed",
      };
    }
    return {
      role: local.role, applied: true, failed: false,
      returnPath: local.returnPath ?? null, source: "local",
    };
  })();

  cache.set(user.id, run);
  // A failed attempt must stay retryable on the next mount / refresh.
  run
    .then((outcome) => { if (outcome.failed) cache.delete(user.id); })
    .catch(() => cache.delete(user.id));

  return run;
}
