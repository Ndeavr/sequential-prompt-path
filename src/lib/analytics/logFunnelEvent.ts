/**
 * UNPRO — Contractor Funnel Event Logger (append-only)
 * Every capture point (SMS, landing, onboarding, checkout, activation) MUST call this.
 * Never overwrites — one row per event.
 */
import { supabase } from "@/integrations/supabase/client";
import { readAttribution } from "@/config/contractorFunnel";

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
  | "activation_completed"
  // Landing "Visibilité IA pour entrepreneurs" (/visibilite-ia-entrepreneurs)
  | "ai_visibility_page_view"
  | "ai_visibility_cta_hero"
  | "ai_visibility_call_click"
  | "ai_visibility_form_start"
  | "ai_visibility_form_error"
  | "ai_visibility_form_submitted"
  | "ai_visibility_cta_final"
  // Parcours « trouvé par l'IA et UNPRO » (audit → profil de matching → forfaits)
  | "ai_audit_viewed"
  | "company_recognized"
  | "profile_started"
  | "matching_field_completed"
  | "profile_completed"
  | "plans_viewed"
  | "checkout_started"
  | "payment_completed"
  | "recommendation_eligible"
  // Parcours canonique P0 (activation entrepreneur sans paiement)
  | "cta_click"
  | "auth_started"
  | "otp_sent"
  | "otp_verified"
  | "auth_completed"
  | "contractor_account_created"
  | "offer_eligible"
  | "activation_page_viewed"
  | "activation_cta_clicked"
  | "contractor_profile_created"
  | "onboarding_resumed"
  | "free_offer_accepted"
  | "plan_requested"
  | "paid";

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
  /** Marque explicitement l'événement comme QA/test (exclu des vues de production). */
  is_test?: boolean;
}

const ATTRIBUTION_KEY = "unpro_funnel_attribution";

/** Attribution première-touche : capturée une fois, conservée pour toute la session. */
export function getFunnelAttribution(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    const current = readAttribution();
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      // Une nouvelle arrivée attribuée écrase seulement si la session n'avait rien.
      if (Object.keys(parsed).length > 0) return parsed;
    }
    if (Object.keys(current).length > 0) {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
    }
    return current;
  } catch {
    return {};
  }
}

/** Vrai si la session est marquée QA (jamais comptée dans les vues de production). */
export function isQaSession(): boolean {
  try {
    if (sessionStorage.getItem("unpro_qa_session") === "1") return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("qa") === "1") {
      sessionStorage.setItem("unpro_qa_session", "1");
      return true;
    }
  } catch { /* noop */ }
  return false;
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

    const attribution = getFunnelAttribution();

    await supabase.from("contractor_funnel_events").insert({
      prospect_id: attribution.prospect_id ?? attribution.prospect ?? null,
      token: attribution.token ?? attribution.t ?? null,
      affiliate_code: attribution.aff ?? attribution.affiliate ?? attribution.ref ?? null,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      is_test: input.is_test ?? isQaSession(),
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
