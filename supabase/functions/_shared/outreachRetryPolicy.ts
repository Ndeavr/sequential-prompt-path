// Shared retry classification for outreach providers (Twilio/Resend).
// Single source of truth used by send + retry functions and by UI badges.

export type RetryClassification = {
  retryable: boolean;
  error_code: string;
  error_message: string;
  recommended_action: string;
};

// Twilio error codes: https://www.twilio.com/docs/api/errors
const TWILIO_NON_RETRYABLE: Record<string, string> = {
  "21211": "Invalid To phone number — do not retry.",
  "21610": "Recipient opted out (STOP) — do not retry.",
  "21614": "Number is not mobile / cannot receive SMS — do not retry.",
  "21408": "Region not enabled on Twilio account — enable region, then retry manually.",
  "20003": "Twilio authentication failed — verify TWILIO_API_KEY / Account SID before retrying.",
  "21606": "Invalid From number — check TWILIO_FROM_NUMBER.",
  "21612": "From number cannot send to this destination.",
  "30003": "Handset unreachable (permanently) — do not retry.",
  "30004": "Message blocked by carrier — do not retry.",
  "30005": "Unknown destination handset — do not retry.",
  "30006": "Landline or unreachable carrier — do not retry.",
};

const TWILIO_RETRYABLE: Record<string, string> = {
  "20429": "Twilio rate-limited (429) — retry with backoff.",
  "30001": "Queue overflow — retry with backoff.",
  "30002": "Account suspended (transient) — verify then retry.",
  "30007": "Carrier violation (transient) — retry.",
};

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

export function classifyTwilio(httpStatus: number, body: unknown): RetryClassification {
  // Twilio returns JSON with { code, message, more_info } on error.
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const code = b.code != null ? String(b.code) : "";
  const msg = typeof b.message === "string" ? b.message : "";

  if (code && TWILIO_NON_RETRYABLE[code]) {
    return {
      retryable: false,
      error_code: code,
      error_message: msg || TWILIO_NON_RETRYABLE[code],
      recommended_action: TWILIO_NON_RETRYABLE[code],
    };
  }
  if (code && TWILIO_RETRYABLE[code]) {
    return {
      retryable: true,
      error_code: code,
      error_message: msg || TWILIO_RETRYABLE[code],
      recommended_action: TWILIO_RETRYABLE[code],
    };
  }
  if (RETRYABLE_HTTP.has(httpStatus)) {
    return {
      retryable: true,
      error_code: `http_${httpStatus}`,
      error_message: msg || `Twilio returned HTTP ${httpStatus}`,
      recommended_action: "Transient provider error — retry with backoff.",
    };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      retryable: false,
      error_code: `http_${httpStatus}`,
      error_message: msg || "Twilio auth failed",
      recommended_action: "Verify TWILIO_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER, and Messaging Service SID.",
    };
  }
  // Unknown → conservative: not retryable, surface details.
  return {
    retryable: false,
    error_code: code || `http_${httpStatus}`,
    error_message: msg || `Unknown Twilio failure (HTTP ${httpStatus})`,
    recommended_action: "Inspect raw provider response before retrying.",
  };
}

export function classifyNetworkError(err: unknown): RetryClassification {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    retryable: true,
    error_code: "network",
    error_message: msg.slice(0, 240),
    recommended_action: "Network/transport error — safe to retry.",
  };
}
