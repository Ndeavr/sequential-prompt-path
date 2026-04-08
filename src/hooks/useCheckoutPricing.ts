/**
 * UNPRO — Checkout Pricing Hook
 * Single source of truth for checkout amounts from backend.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaxLine {
  tax_name: string;
  tax_code: string;
  tax_rate: number;
  amount: number; // cents
}

export interface CheckoutPricing {
  plan_code: string;
  plan_name: string;
  billing_interval: "month" | "year";
  currency: string;
  province_code: string;
  country_code: string;

  base_price: number; // cents
  equivalent_monthly: number; // cents
  yearly_savings_percent: number;

  coupon: {
    code: string;
    label: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    duration_type: string;
    duration_in_months: number | null;
  } | null;

  subtotal_before_discount: number;
  discount_amount: number;
  subtotal_after_discount: number;

  taxes: TaxLine[];
  total_tax: number;
  total_due_today: number;

  renewal: {
    subtotal: number;
    taxes: TaxLine[];
    total_tax: number;
    total: number;
    next_date: string;
    interval_label: string;
  };

  features: string[];
}

export function useCheckoutPricing(
  planCode: string | undefined,
  billingInterval: "month" | "year",
  couponCode: string | null
) {
  return useQuery<CheckoutPricing>({
    queryKey: ["checkout-pricing", planCode, billingInterval, couponCode],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-checkout-pricing", {
        body: {
          planCode,
          billingInterval,
          couponCode: couponCode || undefined,
          provinceCode: "QC",
          countryCode: "CA",
        },
      });
      if (error) throw new Error(error.message || "Erreur de calcul");
      if (data?.error) throw new Error(data.error);
      return data as CheckoutPricing;
    },
    enabled: !!planCode,
    staleTime: 30_000,
  });
}

/** Format cents to CAD display (space-separated thousands, no decimals for round) */
export const fmtCAD = (cents: number): string => {
  const val = cents / 100;
  const isRound = val === Math.floor(val);
  const formatted = isRound
    ? Math.floor(val).toLocaleString("fr-CA")
    : val.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} $`;
};

/** Format cents to CAD with decimals always shown (space-separated thousands) */
export const fmtCADExact = (cents: number): string =>
  `${(cents / 100).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
