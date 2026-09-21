/**
 * UNPRO — Service: Personalized Contractor Pricing Quotes
 * Bridges Alex intake → compute-pricing-quote edge function → quote persistence.
 */
import { supabase } from "@/integrations/supabase/client";
import { rememberClaraReferences } from "@/services/clara/claraSession";

export interface PricingIntakeInput {
  trade_primary: string;
  trade_secondary?: string | null;
  city: string;
  service_radius_km?: number;
  target_monthly_appointments: number;
  /** Objectif de contrats confirmé — distinct du nombre de rendez-vous. */
  contract_goal_value?: number;
  contract_goal_unit?: "month" | "year";
  /** Budget mensuel maximum explicitement choisi (en cents), jamais implicite. */
  monthly_budget_cents?: number;
  pricing_mode?: "goal" | "budget";
  average_project_value: number;
  monthly_capacity: number;
  close_rate_estimate: number;
  desired_growth_level?: "steady" | "growth" | "aggressive";
  wants_exclusivity?: boolean;
  preferred_project_types?: string[];
  seasonal_priority?: "spring" | "summer" | "fall" | "winter" | "all";
  current_google_presence?: number;
  current_ai_visibility_score?: number;
  rbq_number?: string | null;
  company_name?: string | null;
  website_url?: string | null;
}

export interface PricingQuote {
  id: string;
  user_id: string | null;
  contractor_id: string | null;
  company_name: string | null;
  trade_primary: string;
  city: string;
  territory_cluster: string;
  /** "goal" = objectif → budget calculé ; "budget" = budget → garantie calculée. */
  pricing_mode?: "goal" | "budget" | null;
  monthly_budget?: number | null;
  guaranteed_appointments?: number | null;
  contractor_capacity?: number | null;
  target_monthly_appointments: number;
  average_project_value: number;
  estimated_close_rate: number;
  estimated_monthly_revenue_potential: number;
  base_platform_fee: number;
  appointment_package_fee: number;
  territory_competition_multiplier: number;
  seasonality_multiplier: number;
  exclusivity_fee: number;
  aipp_optimization_fee: number;
  recommended_plan: string;
  recommended_monthly_price: number;
  min_monthly_price: number;
  max_monthly_price: number;
  roi_estimate: number;
  pricing_status:
    | "draft"
    | "offered"
    | "accepted"
    | "paid"
    | "waitlisted"
    | "rejected";
  input_payload: Record<string, unknown>;
  breakdown: Record<string, unknown>;
  stripe_checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function computePricingQuote(
  input: PricingIntakeInput,
): Promise<PricingQuote> {
  const { data, error } = await supabase.functions.invoke(
    "compute-pricing-quote",
    { body: input },
  );
  if (error) throw new Error(error.message);
  const payload = data as any;
  if (payload?.error) throw new Error(payload.error);
  // Le serveur renvoie `quote_id` à la racine; certains appels historiques
  // renvoyaient un objet `quote`. On accepte les deux, sans jamais inventer d'id.
  const quote: PricingQuote | null = payload?.quote
    ?? (payload?.quote_id ? ({ ...payload, id: payload.quote_id } as PricingQuote) : null);
  if (!quote?.id) throw new Error("Votre plan a été calculé mais son identifiant est introuvable. Réessayez.");
  // ONE CLARA : même entreprise et même devis personnalisé jusqu'au paiement.
  rememberClaraReferences({
    pricing_quote_id: quote.id,
    contractor_id: quote.contractor_id ?? undefined,
  });
  return quote;
}


export async function fetchPricingQuote(id: string): Promise<PricingQuote | null> {
  const { data, error } = await supabase
    .from("contractor_pricing_quotes" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as unknown as PricingQuote;

  // Devis calculé avant la création du compte : la RLS n'autorise aucune
  // lecture directe. Le serveur ne renvoie que les devis sans propriétaire.
  const { data: guest, error: guestError } = await supabase.functions.invoke(
    "compute-pricing-quote",
    { body: { action: "get", quote_id: id } },
  );
  if (guestError) return null;
  const quote = (guest as { quote?: PricingQuote | null } | null)?.quote ?? null;
  return quote;
}

export function formatCAD(cents: number): string {
  const dollars = Math.round((cents ?? 0) / 100);
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatCADFromDollars(dollars: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars ?? 0);
}
