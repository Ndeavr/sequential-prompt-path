/**
 * UNPRO — Contractor Journey hooks
 * - useContractorJourney(id): full timeline + latest state for one contractor / phone / journey key.
 * - useRevenueRescueQueue(): buckets of at-risk revenue leads.
 * - useContactedContractors(): list of every SMS-touched contractor journey.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JourneyStateRow {
  journey_key: string;
  contractor_id: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  first_activity_at: string;
  last_activity_at: string;
  last_event_type: string | null;
  last_known_path: string | null;
  last_event_metadata: Record<string, unknown> | null;
  current_stage: string;
  rescue_bucket: "clicked_not_registered" | "registered_not_paid" | "paid_not_activated" | null;
  has_sms_queued: boolean;
  has_sms_sent: boolean;
  has_sms_delivered: boolean;
  has_sms_failed: boolean;
  has_clicked: boolean;
  has_landing_view: boolean;
  has_registration_started: boolean;
  has_step_company: boolean;
  has_step_services: boolean;
  has_step_territories: boolean;
  has_step_reviews: boolean;
  has_step_pricing: boolean;
  has_registration_completed: boolean;
  has_checkout_started: boolean;
  has_checkout_opened: boolean;
  has_paid: boolean;
  has_payment_failed: boolean;
  has_activation_started: boolean;
  has_activated: boolean;
}

export interface FunnelEventRow {
  id: string;
  event_type: string;
  event_source: string | null;
  step: string | null;
  current_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  contractor_id: string | null;
  phone: string | null;
  email: string | null;
  session_id: string | null;
  user_id: string | null;
}

/** Resolve a journey key from the `:id` route param (uuid | phone | email | session id). */
async function resolveJourneyKey(id: string): Promise<JourneyStateRow | null> {
  // Try direct match on journey_key first
  const { data } = await supabase
    .from("v_contractor_journey_latest" as any)
    .select("*")
    .eq("journey_key", id)
    .maybeSingle();
  if (data) return data as any;

  // Fallback: try by contractor_id or phone or email
  const { data: any2 } = await supabase
    .from("v_contractor_journey_latest" as any)
    .select("*")
    .or(`contractor_id.eq.${id},phone.eq.${id},email.eq.${id}`)
    .limit(1)
    .maybeSingle();
  return (any2 as any) ?? null;
}

export function useContractorJourney(id: string | undefined) {
  return useQuery({
    queryKey: ["contractor-journey", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const state = await resolveJourneyKey(id);
      if (!state) return { state: null, events: [] as FunnelEventRow[] };

      // Timeline — filter by whichever key we have
      let query = supabase
        .from("contractor_funnel_events" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);

      const or: string[] = [];
      if (state.contractor_id) or.push(`contractor_id.eq.${state.contractor_id}`);
      if (state.phone) or.push(`phone.eq.${state.phone}`);
      if (state.email) or.push(`email.eq.${state.email}`);
      if (state.journey_key) or.push(`session_id.eq.${state.journey_key}`);
      if (or.length) query = query.or(or.join(","));

      const { data: events } = await query;
      return { state, events: (events as any as FunnelEventRow[]) ?? [] };
    },
    refetchInterval: 15_000,
  });
}

export function useRevenueRescueQueue() {
  return useQuery<JourneyStateRow[]>({
    queryKey: ["revenue-rescue-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_revenue_rescue_queue" as any)
        .select("*")
        .limit(200);
      if (error) throw error;
      return (data as any as JourneyStateRow[]) ?? [];
    },
    refetchInterval: 20_000,
  });
}

export function useContactedContractors() {
  return useQuery<JourneyStateRow[]>({
    queryKey: ["contacted-contractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_contractor_journey_latest" as any)
        .select("*")
        .order("last_activity_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any as JourneyStateRow[]) ?? [];
    },
    refetchInterval: 20_000,
  });
}

// ————— Stage → label + abandonment logic

const STAGE_LABEL_FR: Record<string, string> = {
  unknown: "Inconnu",
  sms_queued: "SMS en file",
  sms_sent: "SMS envoyé",
  sms_delivered: "SMS livré",
  clicked: "Lien cliqué",
  landing_view: "Page vue",
  registration_started: "Inscription commencée",
  step_company: "Info entreprise",
  step_services: "Services",
  step_territories: "Territoires",
  step_reviews: "Avis",
  step_pricing: "Tarification vue",
  registration_completed: "Inscription complétée",
  checkout_started: "Checkout créé",
  checkout_opened: "Checkout ouvert",
  paid_not_activated: "Payé — pas activé",
  activated: "Activé",
};

export function stageLabelFr(stage: string): string {
  return STAGE_LABEL_FR[stage] ?? stage;
}

export interface AbandonmentAnalysis {
  currentStage: string;
  currentStageLabel: string;
  minutesSinceLastActivity: number;
  previousEvent: string | null;
  nextExpectedEvent: string | null;
  blocker: string;
}

const NEXT_EXPECTED: Record<string, string> = {
  sms_sent: "sms_delivered",
  sms_delivered: "sms_clicked",
  clicked: "landing_view",
  landing_view: "registration_started",
  registration_started: "registration_step_company",
  step_company: "registration_step_services",
  step_services: "registration_step_territories",
  step_territories: "registration_step_pricing",
  step_pricing: "stripe_checkout_started",
  registration_completed: "stripe_checkout_started",
  checkout_started: "stripe_checkout_opened",
  checkout_opened: "stripe_payment_success",
  paid_not_activated: "activation_completed",
};

const BLOCKER_FR: Record<string, string> = {
  sms_sent: "Livraison Twilio en attente",
  sms_delivered: "Lien pas encore cliqué",
  clicked: "Landing pas chargée",
  landing_view: "Formulaire pas commencé",
  registration_started: "Bloqué à l'entrée du wizard",
  step_company: "Bloqué après l'info entreprise",
  step_services: "Bloqué au choix des services",
  step_territories: "Bloqué au choix des territoires",
  step_pricing: "Friction tarifaire — pas de checkout",
  registration_completed: "Inscrit mais checkout jamais créé",
  checkout_started: "Stripe créé, jamais ouvert",
  checkout_opened: "Stripe ouvert — paiement pas complété",
  paid_not_activated: "Payé mais activation incomplète",
  unknown: "Aucune activité récente",
};

export function analyzeAbandonment(
  state: JourneyStateRow,
  events: FunnelEventRow[],
): AbandonmentAnalysis {
  const last = new Date(state.last_activity_at).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - last) / 60000));
  const previous = events.length >= 2 ? events[events.length - 2].event_type : null;
  return {
    currentStage: state.current_stage,
    currentStageLabel: stageLabelFr(state.current_stage),
    minutesSinceLastActivity: minutes,
    previousEvent: previous,
    nextExpectedEvent: NEXT_EXPECTED[state.current_stage] ?? null,
    blocker: BLOCKER_FR[state.current_stage] ?? "Cause inconnue",
  };
}

/** Reconciliation invariants (Rule 4 of the plan). */
export interface ReconciliationCheck {
  ok: boolean;
  issues: string[];
}

export function reconcile(counts: {
  delivered: number;
  clicked: number;
  registered: number;
  paid: number;
}): ReconciliationCheck {
  const issues: string[] = [];
  if (counts.clicked > 0 && counts.delivered < counts.clicked)
    issues.push(`clicked=${counts.clicked} mais delivered=${counts.delivered} — incohérent.`);
  if (counts.registered > 0 && counts.clicked < counts.registered)
    issues.push(`registered=${counts.registered} mais clicked=${counts.clicked} — incohérent.`);
  if (counts.paid > 0 && counts.registered < counts.paid)
    issues.push(`paid=${counts.paid} mais registered=${counts.registered} — incohérent.`);
  return { ok: issues.length === 0, issues };
}
