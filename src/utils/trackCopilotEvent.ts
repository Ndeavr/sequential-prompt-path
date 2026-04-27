/**
 * trackCopilotEvent — Lightweight analytics for the Copilot homepage flow.
 * Writes to console + window.dataLayer (if present). Non-blocking, never throws.
 */

export type CopilotEventName =
  | "homepage_loaded"
  | "alex_started"
  | "message_sent"
  | "recommended_pro_shown"
  | "booking_started"
  | "booking_completed"
  | "alternative_option_requested"
  | "quote_upload_clicked"
  | "why_pro_opened"
  | "chip_clicked"
  | "profile_save_prompt_shown"
  | "value_summary_shown"
  | "photo_upload_started"
  | "photo_upload_failed"
  | "photo_upload_succeeded"
  | "quick_reply_clicked";

const SESSION_KEY = "unpro_copilot_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function trackCopilotEvent(name: CopilotEventName, metadata: Record<string, any> = {}) {
  try {
    const payload = {
      event: name,
      session_id: getSessionId(),
      timestamp: Date.now(),
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      metadata,
    };
    if (typeof window !== "undefined") {
      // @ts-ignore optional GA / GTM dataLayer
      const dl = (window as any).dataLayer;
      if (Array.isArray(dl)) dl.push(payload);
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[copilot.event]", name, payload.metadata);
    }
  } catch {
    /* noop */
  }
}
