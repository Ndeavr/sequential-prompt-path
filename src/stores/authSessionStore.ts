/**
 * UNPRO — Auth Session Singleton Store
 *
 * One single supabase.auth listener for the entire app, no matter how many
 * components call useAuth(). Avoids the storm of duplicate listeners,
 * duplicate timers, and "session resolution timeout" warnings.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { logBoot } from "@/lib/bootDebug";

type State = {
  session: Session | null;
  loading: boolean;
  initialized: boolean;
};

let state: State = { session: null, loading: true, initialized: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  logBoot("AUTH_SESSION_START");

  // Single listener for the entire app lifetime.
  supabase.auth.onAuthStateChange((event, session) => {
    if (typeof console !== "undefined") {
      console.log("[authStore]", event, session?.user?.id ?? null);
    }
    logBoot("AUTH_STATE_CHANGE", { event, uid: session?.user?.id ?? null });
    setState({ session, loading: false, initialized: true });
  });

  // Fast bootstrap: getSession resolves immediately from localStorage.
  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) console.warn("[authStore] getSession error", error);
      logBoot(data?.session ? "AUTH_SESSION_OK" : "AUTH_SESSION_NULL");
      setState({ session: data?.session ?? null, loading: false, initialized: true });
    })
    .catch((e) => {
      console.warn("[authStore] getSession threw", e);
      logBoot("AUTH_SESSION_ERROR", { error: String(e) });
      setState({ loading: false, initialized: true });
    });

  // Hard safety: 3s max in loading state.
  setTimeout(() => {
    if (state.loading) {
      logBoot("AUTH_SESSION_TIMEOUT", { ms: 3000 });
      setState({ loading: false, initialized: true });
    }
  }, 3000);
}

function subscribe(cb: () => void) {
  bootstrap();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function forceClearAuthSession() {
  bootstrap();
  setState({ session: null, loading: false, initialized: true });
}

export function getAuthSnapshot() {
  bootstrap();
  return state;
}
