/**
 * UNPRO — Pricing Engine Service
 * Client-side service to interact with pricing edge functions.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PricingCalcRequest {
  category_slug: string;
  market_slug: string;
  selected_plan_code: string;
  selected_billing_period: "month" | "year";
  selected_rendezvous_count: number;
  revenue_goal_monthly?: number;
  capacity_monthly?: number;
  close_rate_percent?: number;
  average_contract_value?: number;
  contractor_id?: string;
}

export interface PricingCalcResult {
  quote_id: string;
  recommended_plan_code: string;
  selected_plan: { code: string; name: string; base_price: number };
  category: { slug: string; name: string };
  market: { slug: string; name: string; tier: string };
  multipliers: {
    category: number;
    market: number;
    competitiveness_score: number;
    billing: number;
  };
  amounts: {
    base_plan: number;
    adjusted_plan: number;
    rendezvous: number;
    override_adjustment: number;
    subtotal: number;
    gst: number;
    qst: number;
    total: number;
  };
  projections: {
    total_rendezvous: number;
    estimated_conversions: number;
    estimated_revenue: number;
    estimated_roi: number;
    recommended_rdv_count: number;
  };
  badges: string[];
  billing_period: string;
  all_plans: { code: string; name: string; base_price: number; included_rendezvous: number }[];
}

export async function calculatePricing(req: PricingCalcRequest): Promise<PricingCalcResult> {
  const { data, error } = await supabase.functions.invoke("pricing-calculate", {
    body: req,
  });
  if (error) throw new Error(error.message || "Erreur de calcul");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createPricingCheckout(quoteId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("pricing-create-checkout", {
    body: { quote_id: quoteId },
  });
  if (error) throw new Error(error.message || "Erreur de checkout");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function loadPricingCategories() {
  const { data, error } = await supabase
    .from("pricing_categories")
    .select("id, slug, name_fr, name_en, base_rendezvous_unit_price, base_plan_floor, average_contract_value_min, average_contract_value_max, base_competitiveness_score")
    .eq("is_active", true)
    .order("name_fr");
  if (error) throw error;
  return data || [];
}

export async function loadPricingMarkets() {
  const { data, error } = await supabase
    .from("pricing_markets")
    .select("id, slug, city_name, region_name, market_tier, demand_score, competitiveness_multiplier")
    .eq("is_active", true)
    .order("city_name");
  if (error) throw error;
  return data || [];
}

export async function loadPricingPlans() {
  const { data, error } = await supabase
    .from("pricing_plan_bases")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("base_price");
  if (error) throw error;
  return data || [];
}

export async function loadRdvPackages() {
  const { data, error } = await supabase
    .from("pricing_rendezvous_packages")
    .select("*")
    .eq("is_active", true)
    .order("rendezvous_count");
  if (error) throw error;
  return data || [];
}
