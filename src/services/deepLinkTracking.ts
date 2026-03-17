/**
 * UNPRO — Deep Link Event Tracking
 * Tracks full funnel: scan → landing → CTA → auth → conversion
 */
import { supabase } from "@/integrations/supabase/client";

export type DeepLinkEventType =
  | "qr_scanned"
  | "landing_viewed"
  | "cta_clicked"
  | "auth_started"
  | "auth_completed"
  | "action_resumed"
  | "feature_completed";

const SESSION_KEY = "unpro_dl_session";

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export async function trackDeepLinkEvent(
  eventType: DeepLinkEventType,
  deepLinkId?: string,
  metadata?: Record<string, unknown>,
  userId?: string
) {
  try {
    await supabase.from("deep_link_events" as any).insert([{
      deep_link_id: deepLinkId || null,
      session_id: getOrCreateSessionId(),
      user_id: userId || null,
      event_type: eventType,
      metadata: (metadata || {}) as any,
    }]);
  } catch {
    // Silent — tracking should never break UX
  }
}

/** Store deep link ID in session for later event correlation */
export function setActiveDeepLinkId(id: string) {
  sessionStorage.setItem("unpro_dl_active_id", id);
}

export function getActiveDeepLinkId(): string | null {
  return sessionStorage.getItem("unpro_dl_active_id");
}

export function getSessionId(): string {
  return getOrCreateSessionId();
}
