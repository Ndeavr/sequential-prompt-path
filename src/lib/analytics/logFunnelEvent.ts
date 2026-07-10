/**
 * UNPRO — Contractor Funnel Event Logger (append-only)
 * Every capture point (SMS, landing, onboarding, checkout, activation) MUST call this.
 * Never overwrites — one row per event.
 */
import { supabase } from "@/integrations/supabase/client";

export type FunnelEventType =
  | "sms_queued"
  | "sms_sent"
  | "sms_delivered"
  | "sms_failed"
  | "sms_clicked"
  | "landing_view"
  | "registration_started"
  | "registration_step_company"
  | "registration_step_services"
  | "registration_step_territories"
  | "registration_step_reviews"
  | "registration_step_pricing"
  | "registration_completed"
  | "stripe_checkout_started"
  | "stripe_checkout_opened"
  | "stripe_payment_success"
  | "stripe_payment_failed"
  | "activation_started"
  | "activation_completed";

export type FunnelEventSource =
  | "twilio"
  | "resend"
  | "stripe"
  | "app"
  | "webhook"
  | "edge";

export interface LogFunnelEventInput {
  event_type: FunnelEventType;
  event_source?: FunnelEventSource;
  contractor_id?: string | null;
  phone?: string | null;
  email?: string | null;
  current_path?: string | null;
  step?: string | null;
  metadata?: Record<string, unknown>;
}

let sessionIdCache: string | null = null;
function getSessionId(): string {
  if (sessionIdCache) return sessionIdCache;
  try {
    const key = "unpro_funnel_session_id";
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionIdCache = stored;
      return stored;
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    sessionIdCache = id;
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getDevice(): string {
  try {
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  } catch {
    return "unknown";
  }
}

/**
 * Fire-and-forget. Never throws. Best-effort — analytics must not break UX.
 */
export async function logFunnelEvent(input: LogFunnelEventInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentPath =
      input.current_path ??
      (typeof window !== "undefined" ? window.location.pathname + window.location.search : null);

    await supabase.from("contractor_funnel_events").insert({
      session_id: getSessionId(),
      user_id: user?.id ?? null,
      contractor_id: input.contractor_id ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      event_type: input.event_type,
      event_source: input.event_source ?? "app",
      step: input.step ?? input.event_type,
      current_path: currentPath,
      metadata: input.metadata ?? {},
      source: input.event_source ?? "app",
      device: getDevice(),
    } as never);
  } catch (e) {
    console.error("[logFunnelEvent]", e);
  }
}
