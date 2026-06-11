/**
 * trackFirstCustomerEvent — Centralizes Mission 48H analytics events.
 * Best-effort; never throws.
 */
import { supabase } from "@/integrations/supabase/client";

export type FirstCustomerEvent =
  | "founder_banner_view"
  | "score_started"
  | "score_completed"
  | "activation_started"
  | "checkout_started"
  | "checkout_completed"
  | "founder_paid";

export function trackFirstCustomerEvent(
  event: FirstCustomerEvent,
  payload: Record<string, unknown> = {},
) {
  try {
    void supabase.from("platform_events" as any).insert({
      event_type: event,
      payload: { ...payload, mission: "first_customer_48h" },
    });
  } catch {
    /* noop */
  }
}
