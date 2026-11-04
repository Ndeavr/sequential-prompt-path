// UNPRO — P0: truthful provider health semantics.
//
// A send-only (restricted) Resend key legitimately gets 401/403 from
// /domains and /api-keys with an EXPLICIT "restricted to sending" message.
// Only that explicit body downgrades the verdict to "limited"; every other
// 401/403 stays a hard credential failure (red).
// An idle SMS channel (no recent send, stale webhook) is a WARNING, not a
// credential failure — otherwise an idle system can never become healthy.

export type HealthLevel = "green" | "yellow" | "red";

export type HealthVerdict = {
  level: HealthLevel;
  code: string;
  hard_block: boolean;
  introspection_available: boolean;
  message: string;
};

/**
 * Explicit markers Resend returns for a send-only restricted key.
 * Anything outside this list is a genuine authentication failure.
 */
const RESTRICTED_KEY_MARKERS = [
  "restricted_api_key",
  "this api key is restricted to only send emails",
  "restricted to only send emails",
  "this api key can only be used to send emails",
  "sending_access_only",
];

export function isRestrictedSendOnlyBody(body: unknown): boolean {
  if (body === null || body === undefined) return false;
  let text: string;
  if (typeof body === "string") text = body;
  else {
    try { text = JSON.stringify(body); } catch { return false; }
  }
  const lower = text.toLowerCase();
  return RESTRICTED_KEY_MARKERS.some((m) => lower.includes(m));
}

export function classifyResendProbe(input: {
  keyPresent: boolean;
  httpStatus?: number | null;
  responseBody?: unknown;
  lastSuccessfulSendAt?: string | null;
  nowMs?: number;
  recentWindowMs?: number;
}): HealthVerdict {
  if (!input.keyPresent) {
    return { level: "red", code: "MISSING_CREDENTIALS", hard_block: true, introspection_available: false, message: "Clé Resend absente." };
  }
  const status = input.httpStatus ?? null;
  const now = input.nowMs ?? Date.now();
  const window = input.recentWindowMs ?? 7 * 24 * 60 * 60 * 1000;
  const lastSend = input.lastSuccessfulSendAt ? new Date(input.lastSuccessfulSendAt).getTime() : null;
  const recentSend = lastSend !== null && Number.isFinite(lastSend) && lastSend <= now && now - lastSend < window;

  if (status === 401 || status === 403) {
    if (isRestrictedSendOnlyBody(input.responseBody)) {
      return {
        level: recentSend ? "green" : "yellow",
        code: "SENDING_CAPABLE_RESTRICTED_KEY",
        hard_block: false,
        introspection_available: false,
        message: recentSend
          ? "Clé d'envoi restreinte : introspection non disponible, dernier envoi réussi récent."
          : "Clé d'envoi restreinte : introspection non disponible, aucun envoi récent à confirmer.",
      };
    }
    return {
      level: "red",
      code: "INVALID_AUTH",
      hard_block: true,
      introspection_available: false,
      message: "Authentification du fournisseur d'envoi refusée.",
    };
  }
  if (status !== null && status >= 500) {
    return { level: "red", code: "PROVIDER_FAILURE", hard_block: true, introspection_available: false, message: "Panne du fournisseur d'envoi." };
  }
  if (status !== null && status >= 200 && status < 300) {
    return { level: "green", code: "OK", hard_block: false, introspection_available: true, message: "Fournisseur d'envoi opérationnel." };
  }
  return { level: recentSend ? "green" : "yellow", code: "UNKNOWN_STATE", hard_block: false, introspection_available: false, message: "État du fournisseur indéterminé." };
}

export function classifySmsChannel(input: {
  credentialsPresent: boolean;
  lastProviderErrorCode?: string | null;
  lastSuccessfulSendAt?: string | null;
  lastCallbackAt?: string | null;
  nowMs?: number;
  recentWindowMs?: number;
}): HealthVerdict {
  if (!input.credentialsPresent) return { level: "red", code: "MISSING_CREDENTIALS", hard_block: true, introspection_available: false, message: "Identifiants SMS absents." };
  const authErrors = ["20003", "20404", "AUTH", "TWILIO_AUTH_ERROR"];
  if (input.lastProviderErrorCode && authErrors.includes(String(input.lastProviderErrorCode))) {
    return { level: "red", code: "INVALID_CREDENTIALS", hard_block: true, introspection_available: false, message: "Authentification SMS refusée par le fournisseur." };
  }
  const now = input.nowMs ?? Date.now();
  const window = input.recentWindowMs ?? 24 * 60 * 60 * 1000;
  const lastSend = input.lastSuccessfulSendAt ? new Date(input.lastSuccessfulSendAt).getTime() : null;
  const recentSend = lastSend !== null && Number.isFinite(lastSend) && now - lastSend < window;
  const lastCb = input.lastCallbackAt ? new Date(input.lastCallbackAt).getTime() : null;
  if (recentSend) {
    const callbackConfirmed = lastCb !== null && Number.isFinite(lastCb) && lastCb >= (lastSend ?? now) && lastCb <= now;
    return callbackConfirmed
      ? { level: "green", code: "OK", hard_block: false, introspection_available: true, message: "Envoi et rappel SMS confirmés récemment." }
      : { level: "yellow", code: "CALLBACK_UNVERIFIED", hard_block: false, introspection_available: true, message: "Envoi récent : réception du rappel SMS à vérifier." };
  }
  return { level: "yellow", code: "NO_RECENT_SEND", hard_block: false, introspection_available: true, message: "Aucun envoi récent : système au repos, pas une panne." };
}

/**
 * Consecutive "processed > 0 but sent = 0" detector.
 * `cycles` is chronological (oldest first). A cycle that sent something OR
 * processed nothing resets the counter.
 */
export function detectSilentProcessingAnomaly(
  cycles: Array<{ processed: number; sent: number; at?: string | null }>,
  threshold = 2,
): { anomaly: boolean; consecutive: number; since: string | null } {
  let consecutive = 0;
  let since: string | null = null;
  for (let i = cycles.length - 1; i >= 0; i--) {
    const c = cycles[i];
    if (c.processed > 0 && c.sent === 0) {
      consecutive++;
      since = c.at ?? since;
    } else break;
  }
  return { anomaly: consecutive >= threshold, consecutive, since };
}

/**
 * resend-key-diagnose root-cause classification (pure, testable).
 * A 401/403 with the explicit send-only body means "read scope absent",
 * never "key invalid" nor "gateway unreachable"; domain state stays UNKNOWN.
 * Nothing is declared healthy without a real 2xx proof.
 */
export type DiagnoseProbe = { status: number; body?: unknown };
export type DiagnoseVerdict = {
  root_cause: string;
  repair: string;
  domain_state: "verified" | "unverified" | "unknown";
};

export function classifyKeyDiagnose(input: {
  present: boolean;
  gatewayKey: boolean;
  hasWhitespace: boolean;
  apiKeys: DiagnoseProbe;
  domains: DiagnoseProbe & { verified?: string | null };
}): DiagnoseVerdict {
  const { apiKeys, domains } = input;
  const ok = (s: number) => s >= 200 && s < 300;
  const authFail = (s: number) => s === 401 || s === 403;
  const domain_state: DiagnoseVerdict["domain_state"] = ok(domains.status)
    ? (domains.verified ? "verified" : "unverified")
    : "unknown";
  if (!input.present) return { root_cause: "missing_secret", repair: "add_secret RESEND_API_KEY", domain_state };
  const sendOnly =
    (authFail(apiKeys.status) && isRestrictedSendOnlyBody(apiKeys.body)) ||
    (authFail(domains.status) && isRestrictedSendOnlyBody(domains.body));
  const anyInvalid =
    (authFail(apiKeys.status) && !isRestrictedSendOnlyBody(apiKeys.body)) ||
    (authFail(domains.status) && !isRestrictedSendOnlyBody(domains.body));
  if (sendOnly && !anyInvalid) {
    return {
      root_cause: "send_only_scope_unverified_send",
      repair: "none_required_for_reads; sending capability unproven until a real provider acceptance + delivered webhook",
      domain_state,
    };
  }
  if (input.gatewayKey && ok(apiKeys.status)) {
    return { root_cause: domain_state === "unverified" ? "no_verified_domain" : "ok_gateway", repair: domain_state === "unverified" ? "Verify a sending domain in Resend" : "none", domain_state };
  }
  if (input.gatewayKey && authFail(apiKeys.status)) {
    return { root_cause: "gateway_auth_rejected", repair: `Gateway returned HTTP ${apiKeys.status} without send-only marker. Check the Resend connection.`, domain_state };
  }
  if (input.gatewayKey) {
    return { root_cause: "gateway_unreachable", repair: `Gateway returned HTTP ${apiKeys.status}.`, domain_state };
  }
  if (input.hasWhitespace) return { root_cause: "whitespace_corruption", repair: "Re-save secret without whitespace/newline", domain_state };
  if (authFail(apiKeys.status)) return { root_cause: "revoked_key_or_no_scope", repair: "Check RESEND_API_KEY validity", domain_state };
  if (domain_state === "unverified") return { root_cause: "no_verified_domain", repair: "Verify a sending domain in Resend", domain_state };
  if (ok(apiKeys.status) || ok(domains.status)) return { root_cause: "ok", repair: "none", domain_state };
  return { root_cause: "unknown", repair: "manual_required", domain_state };
}
