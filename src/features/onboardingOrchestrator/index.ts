/**
 * Onboarding Orchestrator — client helpers.
 * State machine + advance function used across contractor flows (landing, registration, OTP, payment).
 */
import { supabase } from "@/integrations/supabase/client";

export const ONBOARDING_STATES = [
  "SCRAPED", "VALIDATING", "CONTACTABLE", "NEEDS_REVIEW",
  "INVITED", "LANDED", "REGISTERING", "OTP_VERIFIED",
  "PAYMENT_COMPLETE", "ACTIVATED", "PROFILE_ENRICHMENT",
  "VERIFIED", "RECOMMENDATION_ELIGIBLE", "LIVE", "STUCK",
] as const;
export type OnboardingState = typeof ONBOARDING_STATES[number];

export const STATE_LABELS: Record<OnboardingState, string> = {
  SCRAPED: "Trouvée",
  VALIDATING: "Validation",
  CONTACTABLE: "Prête à contacter",
  NEEDS_REVIEW: "À revoir",
  INVITED: "Invitée",
  LANDED: "Landing vue",
  REGISTERING: "Inscription",
  OTP_VERIFIED: "OTP vérifié",
  PAYMENT_COMPLETE: "Paiement reçu",
  ACTIVATED: "Activée",
  PROFILE_ENRICHMENT: "Enrichissement",
  VERIFIED: "Vérifiée",
  RECOMMENDATION_ELIGIBLE: "Recommandable",
  LIVE: "Live",
  STUCK: "Bloquée",
};

export const STATE_COLOR: Record<OnboardingState, string> = {
  SCRAPED: "text-slate-300",
  VALIDATING: "text-blue-300",
  CONTACTABLE: "text-amber-300",
  NEEDS_REVIEW: "text-amber-500",
  INVITED: "text-cyan-300",
  LANDED: "text-cyan-200",
  REGISTERING: "text-violet-300",
  OTP_VERIFIED: "text-violet-200",
  PAYMENT_COMPLETE: "text-emerald-300",
  ACTIVATED: "text-emerald-300 font-semibold",
  PROFILE_ENRICHMENT: "text-teal-300",
  VERIFIED: "text-teal-200",
  RECOMMENDATION_ELIGIBLE: "text-lime-300",
  LIVE: "text-emerald-400 font-bold",
  STUCK: "text-rose-400",
};

/** Advance a contractor to a new state. Actor defaults to `user` when called from the app. */
export async function advanceOnboarding(
  contractorId: string,
  toState: OnboardingState,
  metadata: Record<string, unknown> = {},
  actor: "system" | "user" | "admin" | "affiliate" = "user",
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from("contractor_onboarding_states" as any)
      .select("state")
      .eq("contractor_id", contractorId)
      .maybeSingle();

    const from = (current as any)?.state ?? null;

    await supabase.from("contractor_onboarding_states" as any).upsert({
      contractor_id: contractorId,
      state: toState,
      previous_state: from,
      next_action_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      ...(toState === "ACTIVATED" ? { activated_at: new Date().toISOString() } : {}),
      ...(toState === "LIVE" ? { live_at: new Date().toISOString() } : {}),
    }, { onConflict: "contractor_id" });

    await supabase.from("contractor_onboarding_events" as any).insert({
      contractor_id: contractorId,
      from_state: from,
      to_state: toState,
      actor,
      metadata,
    });
  } catch (e) {
    console.warn("[advanceOnboarding]", e);
  }
}

export interface OnboardingRow {
  contractor_id: string;
  state: OnboardingState;
  previous_state: OnboardingState | null;
  confidence_score: number | null;
  readiness_score: number | null;
  retry_count: number;
  blocked_reason: string | null;
  stuck_since: string | null;
  activated_at: string | null;
  live_at: string | null;
  updated_at: string;
}

export interface OnboardingEvent {
  id: string;
  contractor_id: string;
  from_state: OnboardingState | null;
  to_state: OnboardingState;
  actor: string;
  duration_ms: number | null;
  retry_count: number;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
