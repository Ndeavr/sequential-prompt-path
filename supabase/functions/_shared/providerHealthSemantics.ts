// UNPRO — P0: truthful provider health semantics.
//
// A send-only (restricted) Resend key legitimately gets 401/403 from
// /domains and /api-keys: introspection is not permitted, the key is still
// able to SEND. That is "limited", never "invalid credentials".
// An idle SMS channel (no recent send, stale webhook) is a WARNING, not a
// credential failure — otherwise an idle system can never become healthy.

export type HealthLevel = "green" | "yellow" | "red";

export type HealthVerdict = {
  level: HealthLevel;
  code: string;
  /** true only for missing/invalid credentials or a real provider failure. */
  hard_block: boolean;
  introspection_available: boolean;
  message: string;
};

export function classifyResendProbe(input: {
  keyPresent: boolean;
  httpStatus?: number | null;
  lastSuccessfulSendAt?: string | null;
  nowMs?: number;
  recentWindowMs?: number;
}): HealthVerdict {
  if (!input.keyPresent) {
    return {
      level: "red", code: "MISSING_CREDENTIALS", hard_block: true,
      introspection_available: false,
      message: "Clé Resend absente.",
    };
  }
  const status = input.httpStatus ?? null;
  const now = input.nowMs ?? Date.now();
  const window = input.recentWindowMs ?? 7 * 24 * 60 * 60 * 1000;
  const lastSend = input.lastSuccessfulSendAt ? new Date(input.lastSuccessfulSendAt).getTime() : null;
  const recentSend = lastSend !== null && Number.isFinite(lastSend) && now - lastSend < window;

  if (status === 401 || status === 403) {
    // Restricted send-only key: introspection denied, sending still possible.
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
  if (status !== null && status >= 500) {
    return {
      level: "red", code: "PROVIDER_FAILURE", hard_block: true,
      introspection_available: false,
      message: "Panne du fournisseur d'envoi.",
    };
  }
  if (status !== null && status >= 200 && status < 300) {
    return {
      level: "green", code: "OK", hard_block: false,
      introspection_available: true,
      message: "Fournisseur d'envoi opérationnel.",
    };
  }
  return {
    level: recentSend ? "green" : "yellow",
    code: "UNKNOWN_STATE", hard_block: false,
    introspection_available: false,
    message: "État du fournisseur indéterminé.",
  };
}

export function classifySmsChannel(input: {
  credentialsPresent: boolean;
  lastProviderErrorCode?: string | null;
  lastSuccessfulSendAt?: string | null;
  lastCallbackAt?: string | null;
  nowMs?: number;
  recentWindowMs?: number;
}): HealthVerdict {
  if (!input.credentialsPresent) {
    return {
      level: "red", code: "MISSING_CREDENTIALS", hard_block: true,
      introspection_available: false, message: "Identifiants SMS absents.",
    };
  }
  const authErrors = ["20003", "20404", "AUTH", "TWILIO_AUTH_ERROR"];
  if (input.lastProviderErrorCode && authErrors.includes(String(input.lastProviderErrorCode))) {
    return {
      level: "red", code: "INVALID_CREDENTIALS", hard_block: true,
      introspection_available: false, message: "Authentification SMS refusée par le fournisseur.",
    };
  }
  const now = input.nowMs ?? Date.now();
  const window = input.recentWindowMs ?? 24 * 60 * 60 * 1000;
  const lastSend = input.lastSuccessfulSendAt ? new Date(input.lastSuccessfulSendAt).getTime() : null;
  const recentSend = lastSend !== null && Number.isFinite(lastSend) && now - lastSend < window;
  if (recentSend) {
    return { level: "green", code: "OK", hard_block: false, introspection_available: true, message: "Envoi SMS confirmé récemment." };
  }
  const lastCb = input.lastCallbackAt ? new Date(input.lastCallbackAt).getTime() : null;
  const staleCb = lastCb === null || now - lastCb >= window;
  return {
    level: "yellow",
    code: staleCb ? "WEBHOOK_STALE" : "NO_RECENT_SEND",
    hard_block: false,
    introspection_available: true,
    message: "Aucun envoi récent : système au repos, pas une panne.",
  };
}

/** Consecutive "processed > 0 but sent = 0" is an anomaly, never a success. */
export function detectSilentProcessingAnomaly(
  cycles: Array<{ processed: number; sent: number }>,
  threshold = 2,
): { anomaly: boolean; consecutive: number } {
  let consecutive = 0;
  for (let i = cycles.length - 1; i >= 0; i--) {
    const c = cycles[i];
    if (c.processed > 0 && c.sent === 0) consecutive++;
    else break;
  }
  return { anomaly: consecutive >= threshold, consecutive };
}
