/**
 * UNPRO — Growth Calculator Engine (client layer)
 *
 * Local math ONLY for the contractor's own objectives (growth, contracts, RDV).
 * Every price comes from the canonical `compute-pricing-quote` edge function.
 * No parallel pricing system is allowed here.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GrowthInputs {
  companyName: string;
  trade: string;
  city: string;
  radiusKm: number;
  annualRevenue: number; // CAD dollars
  marginPercent: number; // 0..100
  avgProjectValue: number; // CAD dollars
  closeRate: number; // 0..100
  growthMode: "percent" | "amount";
  growthValue: number; // % or CAD dollars
  monthlyCapacity: number; // max projects / month
  wantsExclusivity: boolean;
  billingInterval: "month" | "year";
}

export const DEFAULT_GROWTH_INPUTS: GrowthInputs = {
  companyName: "",
  trade: "",
  city: "",
  radiusKm: 25,
  annualRevenue: 0,
  marginPercent: 25,
  avgProjectValue: 0,
  closeRate: 30,
  growthMode: "percent",
  growthValue: 20,
  monthlyCapacity: 0,
  wantsExclusivity: false,
  billingInterval: "month",
};

export interface GrowthMath {
  growthAmount: number;
  contractsNeeded: number;
  appointmentsNeeded: number;
  monthlyAppointments: number;
  potentialGrossProfit: number;
  expectedGrossProfitPerAppointment: number;
  monthlyContracts: number;
  capacityExceeded: boolean;
  maxMonthlyAppointmentsByCapacity: number;
}

/** Pure objective math — no pricing. */
export function computeGrowthMath(i: GrowthInputs): GrowthMath | null {
  if (!i.annualRevenue || !i.avgProjectValue) return null;

  const growthAmount =
    i.growthMode === "amount"
      ? Math.max(0, i.growthValue)
      : Math.max(0, Math.round(i.annualRevenue * (i.growthValue / 100)));

  const contractsNeeded = Math.ceil(growthAmount / i.avgProjectValue) || 0;
  const close = (i.closeRate > 0 ? i.closeRate : 30) / 100;
  const appointmentsNeeded = close > 0 ? Math.ceil(contractsNeeded / close) : 0;
  const monthlyAppointments = Math.ceil(appointmentsNeeded / 12);
  const monthlyContracts = Math.ceil(contractsNeeded / 12);
  const margin = (i.marginPercent > 0 ? i.marginPercent : 0) / 100;
  const potentialGrossProfit = Math.round(growthAmount * margin);
  const expectedGrossProfitPerAppointment =
    appointmentsNeeded > 0 ? Math.round(potentialGrossProfit / appointmentsNeeded) : 0;

  const maxMonthlyAppointmentsByCapacity =
    i.monthlyCapacity > 0 && close > 0 ? Math.floor(i.monthlyCapacity / close) : 0;

  return {
    growthAmount,
    contractsNeeded,
    appointmentsNeeded,
    monthlyAppointments,
    potentialGrossProfit,
    expectedGrossProfitPerAppointment,
    monthlyContracts,
    capacityExceeded:
      i.monthlyCapacity > 0 && monthlyContracts > Math.round(i.monthlyCapacity),
    maxMonthlyAppointmentsByCapacity,
  };
}

export interface GrowthQuote {
  quote_id: string;
  recommended_plan: string;
  plan_name: string;
  recommended_monthly_price: number; // cents
  pricing_status: string;
  data_status: string;
  factors: Record<string, unknown>;
  availability: Record<string, unknown> | null;
  capacity_availability: Record<string, unknown> | null;
  pricing_explanation: Record<string, unknown> | null;
  growth: {
    profile_fee_cents: number;
    billing_interval: "month" | "year";
    monthly_price_cents: number;
    annual_price_cents: number;
    annual_savings_cents: number;
    annual_months_charged: number;
    due_today_cents: number;
    growth_amount_cents: number | null;
    competition_level: "faible" | "moyenne" | "forte";
    territory_override: { price_multiplier: number; manually_validated: boolean } | null;
    entry_pack: {
      total_price_cents: number;
      duration_months: number;
      max_appointments: number;
      guaranteed_appointments: number;
      outcome: string;
      requires_confirmation: boolean;
    };
  };
}

/** Trades + cities autocompletion from real reference tables. */
export function useCalculatorReferenceData() {
  return useQuery({
    queryKey: ["growth-calculator-reference"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [{ data: cats }, { data: cities }] = await Promise.all([
        supabase
          .from("service_categories")
          .select("slug,name,name_fr")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("cities")
          .select("slug,name,population")
          .eq("is_active", true)
          .order("population", { ascending: false })
          .limit(400),
      ]);

      return {
        trades: (cats ?? []).map((c: any) => ({
          value: (c.name_fr || c.name) as string,
          label: (c.name_fr || c.name) as string,
        })),
        cities: (cities ?? []).map((c: any) => ({
          value: c.name as string,
          label: c.name as string,
        })),
      };
    },
  });
}

export function useGrowthCalculatorEngine() {
  const [inputs, setInputs] = useState<GrowthInputs>(DEFAULT_GROWTH_INPUTS);
  const [quote, setQuote] = useState<GrowthQuote | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(<K extends keyof GrowthInputs>(key: K, value: GrowthInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const math = useMemo(() => computeGrowthMath(inputs), [inputs]);

  const canCompute = Boolean(
    inputs.trade && inputs.city && inputs.annualRevenue > 0 && inputs.avgProjectValue > 0 && math,
  );

  const computeQuote = useCallback(async () => {
    if (!math || !canCompute) return null;
    setComputing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("compute-pricing-quote", {
        body: {
          company_name: inputs.companyName || null,
          trade_primary: inputs.trade,
          city: inputs.city,
          service_cities: [inputs.city],
          service_radius_km: inputs.radiusKm,
          pricing_mode: "goal",
          target_monthly_appointments: math.monthlyAppointments,
          average_project_value: inputs.avgProjectValue,
          monthly_capacity: inputs.monthlyCapacity || math.monthlyContracts,
          close_rate_estimate: inputs.closeRate,
          wants_exclusivity: inputs.wantsExclusivity,
          business_objective: "grow",
          annual_revenue: inputs.annualRevenue,
          gross_margin_percent: inputs.marginPercent,
          growth_mode: inputs.growthMode,
          growth_value: inputs.growthValue,
          billing_interval: inputs.billingInterval,
          source: "growth_calculator",
        },
      });
      if (fnError) throw new Error(fnError.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setQuote(data as GrowthQuote);
      return data as GrowthQuote;
    } catch (e: any) {
      setError(e?.message || "Impossible de calculer votre forfait.");
      return null;
    } finally {
      setComputing(false);
    }
  }, [inputs, math, canCompute]);

  return { inputs, update, setInputs, math, quote, setQuote, computing, error, canCompute, computeQuote };
}
