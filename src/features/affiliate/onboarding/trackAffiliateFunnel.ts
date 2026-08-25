/**
 * Traçage du funnel affilié — append-only, aucune donnée sensible.
 * Événements côté client (landing, onboarding) ; les événements d'audit et
 * de conversion sont écrits côté serveur à partir des états réels.
 */
import { supabase } from "@/integrations/supabase/client";

export type AffiliateFunnelEvent =
  | "affiliate_landing_view"
  | "affiliate_start_clicked"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "affiliate_activated"
  | "first_prospect_viewed"
  | "call_started"
  | "audit_sent"
  | "audit_opened"
  | "audit_started"
  | "audit_completed"
  | "profile_claimed"
  | "checkout_started"
  | "paid_conversion"
  | "commission_created";

const SESSION_KEY = "unpro_aff_funnel_session";

export function getFunnelSessionId(): string {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export async function trackAffiliateFunnel(
  event: AffiliateFunnelEvent,
  extra?: { affiliate_id?: string | null; metadata?: Record<string, unknown> }
) {
  try {
    const params = new URLSearchParams(window.location.search);
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem("unpro_ref") ?? "null");
      } catch {
        return null;
      }
    })();
    await (supabase as any).from("affiliate_funnel_events").insert({
      affiliate_id: extra?.affiliate_id ?? null,
      session_id: getFunnelSessionId(),
      event_type: event,
      ref_code: params.get("ref") ?? stored?.refCode ?? null,
      utm_source: params.get("utm_source") ?? stored?.utmSource ?? null,
      utm_medium: params.get("utm_medium") ?? null,
      utm_campaign: params.get("utm_campaign") ?? null,
      metadata: extra?.metadata ?? {},
    });
  } catch {
    /* jamais bloquant */
  }
}
