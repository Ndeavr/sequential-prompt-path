/**
 * UNPRO — Service: Personalized Contractor Pricing Quotes
 * Bridges Alex intake → compute-pricing-quote edge function → quote persistence.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PricingIntakeInput {
  trade_primary: string;
  trade_secondary?: string | null;
  city: string;
  service_radius_km?: number;
  target_monthly_appointments: number;
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
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).quote as PricingQuote;
}

export async function fetchPricingQuote(id: string): Promise<PricingQuote | null> {
  const { data, error } = await supabase
    .from("contractor_pricing_quotes" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PricingQuote) ?? null;
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
