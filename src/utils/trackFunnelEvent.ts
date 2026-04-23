/**
 * UNPRO — Funnel Event Tracker
 * Tracks every contractor funnel step for conversion analytics.
 */
import { supabase } from "@/integrations/supabase/client";

export type FunnelEventType =
  | "landing_viewed"
  | "signup_started"
  | "signup_completed"
  | "import_started"
  | "import_completed"
  | "aipp_viewed"
  | "plan_selected"
  | "checkout_started"
  | "payment_completed"
  | "activation_viewed"
  | "alex_started"
  | "dropoff";

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  const stored = sessionStorage.getItem("unpro_funnel_session_id");
  if (stored) {
    sessionId = stored;
    return stored;
  }
  const id = crypto.randomUUID();
  sessionStorage.setItem("unpro_funnel_session_id", id);
  sessionId = id;
  return id;
}

function getDevice(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export async function trackFunnelEvent(
  eventType: FunnelEventType,
  metadata: Record<string, string | number | boolean | null> = {},
  step?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("contractor_funnel_events").insert([{
      session_id: getSessionId(),
      user_id: user?.id || null,
      event_type: eventType,
      step: step || eventType,
      metadata,
      source: document.referrer ? new URL(document.referrer).hostname : "direct",
      device: getDevice(),
    }]);
  } catch (e) {
    console.error("[trackFunnelEvent]", e);
  }
}

/**
 * Schedule follow-up queue entries when a user drops off.
 * Called from checkout/payment pages when user has not completed payment.
 */
export async function scheduleFollowUps(
  userId: string,
  email: string,
  businessName: string
) {
  try {
    const now = new Date();
    const entries = [
      { trigger_type: "1h", scheduled_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString() },
      { trigger_type: "24h", scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() },
      { trigger_type: "3d", scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    for (const entry of entries) {
      await supabase.from("contractor_followup_queue").insert({
        user_id: userId,
        email,
        business_name: businessName,
        ...entry,
      });
    }
  } catch (e) {
    console.error("[scheduleFollowUps]", e);
  }
}
