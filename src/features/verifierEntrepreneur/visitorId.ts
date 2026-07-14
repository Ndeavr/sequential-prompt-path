/**
 * verifierEntrepreneur — Local utilities.
 * Visitor ID persistence so that an anonymous verification can be re-attached
 * to the correct account after the homeowner logs in via OTP.
 */
const KEY = "unpro_verify_visitor_id";
const RUN_KEY = "unpro_verify_last_run_id";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

export function rememberRun(runId: string) {
  try {
    window.localStorage.setItem(RUN_KEY, runId);
  } catch {
    /* noop */
  }
}

export function getLastRunId(): string | null {
  try {
    return window.localStorage.getItem(RUN_KEY);
  } catch {
    return null;
  }
}

export function clearLastRun() {
  try {
    window.localStorage.removeItem(RUN_KEY);
  } catch {
    /* noop */
  }
}
