/**
 * UNPRO — Auth Debug Bus (DEV ONLY)
 *
 * Lightweight pub/sub store that captures the live state of the auth flow
 * so we can surface exactly where login fails. All write operations are
 * **no-ops in production** — the bus exists but does nothing, so there is
 * zero runtime overhead and zero PII leakage in shipped builds.
 */

import { useSyncExternalStore } from "react";

const IS_DEV = import.meta.env.DEV;

export type AuthStep =
  | "idle"
  | "method_selected"
  | "oauth_initiating"
  | "oauth_redirecting"
  | "magic_link_submitting"
  | "magic_link_sent"
  | "sms_sending"
  | "sms_sent"
  | "otp_verifying"
  | "otp_verified"
  | "callback_processing"
  | "exchange_code"
  | "session_resolved"
  | "creating_profile"
  | "applying_prelogin_role"
  | "signed_in"
  | "roles_resolved"
  | "gate_checking"
  | "gate_role_ensured"
  | "redirecting"
  | "done"
  | "error";

export type AuthMethod =
  | "google"
  | "magic_link"
  | "sms"
  | "oauth"
  | "unknown"
  | null;

export interface AuthDebugState {
  auth_step: AuthStep;
  auth_method: AuthMethod;
  session_found: boolean | null;
  user_id: string | null;
  user_email_masked: string | null;
  redirect_target: string | null;
  last_error: string | null;
  last_error_step: AuthStep | null;
  provider: string | null;
  prelogin_role: string | null;
  roles: string[];
  intent_path: string | null;
  started_at: number;
  updated_at: number;
  history: { step: AuthStep; ts: number; note?: string }[];
}

const INITIAL: AuthDebugState = {
  auth_step: "idle",
  auth_method: null,
  session_found: null,
  user_id: null,
  user_email_masked: null,
  redirect_target: null,
  last_error: null,
  last_error_step: null,
  provider: null,
  prelogin_role: null,
  roles: [],
  intent_path: null,
  started_at: Date.now(),
  updated_at: Date.now(),
  history: [],
};

let state: AuthDebugState = { ...INITIAL };
const listeners = new Set<() => void>();

function maskEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const prefix = (local?.[0] ?? "*") + "***";
  return `${prefix}@${domain}`;
}

function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
}

export const authDebug = {
  set(partial: Partial<AuthDebugState> & { note?: string }) {
    if (!IS_DEV) return;
    const { note, ...rest } = partial;
    const next: AuthDebugState = {
      ...state,
      ...rest,
      updated_at: Date.now(),
    };
    if (rest.auth_step && rest.auth_step !== state.auth_step) {
      next.history = [
        ...state.history.slice(-19),
        { step: rest.auth_step as AuthStep, ts: Date.now(), note },
      ];
    }
    state = next;
    emit();
  },

  setSession(user: { id?: string | null; email?: string | null } | null) {
    if (!IS_DEV) return;
    if (!user) {
      authDebug.set({ session_found: false, user_id: null, user_email_masked: null });
      return;
    }
    authDebug.set({
      session_found: true,
      user_id: user.id ?? null,
      user_email_masked: maskEmail(user.email ?? null),
    });
  },

  error(err: unknown, where: AuthStep = "error") {
    if (!IS_DEV) return;
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : (() => {
              try { return JSON.stringify(err); } catch { return String(err); }
            })();
    state = {
      ...state,
      auth_step: "error",
      last_error: message?.slice(0, 240) ?? "unknown error",
      last_error_step: where,
      updated_at: Date.now(),
      history: [
        ...state.history.slice(-19),
        { step: "error", ts: Date.now(), note: `@${where}: ${message?.slice(0, 80)}` },
      ],
    };
    emit();
  },

  reset() {
    state = { ...INITIAL, started_at: Date.now(), updated_at: Date.now(), history: [] };
    emit();
  },

  get(): AuthDebugState {
    return state;
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useAuthDebug(): AuthDebugState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
