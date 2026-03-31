/**
 * UNPRO — Dynamic Appointment Pricing Service
 * Fetches real Google Ads CPL-based pricing with seasonal adjustments.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AppointmentBenchmark {
  id: string;
  category_slug: string;
  market_slug: string;
  google_ads_cpl_cents: number;
  unpro_markup_percent: number;
  seasonal_multiplier: number;
  season_code: string;
  base_appointment_price_cents: number;
  final_appointment_price_cents: number;
}

export interface SeasonalRule {
  category_slug: string;
  season_code: string;
  month_start: number;
  month_end: number;
  multiplier: number;
  label_fr: string;
}

function getCurrentSeason(month: number, rules: SeasonalRule[], categorySlug: string): SeasonalRule | null {
  return rules.find(r => {
    if (r.category_slug !== categorySlug) return false;
    if (r.month_start <= r.month_end) {
      return month >= r.month_start && month <= r.month_end;
    }
    // Wraps around year (e.g., Dec-Feb: 12-2)
    return month >= r.month_start || month <= r.month_end;
  }) || null;
}

export function getSeasonalPrice(baseCents: number, seasonalMultiplier: number): number {
  return Math.round(baseCents * seasonalMultiplier);
}

export function formatCentsToCAD(cents: number): string {
  return `${(cents / 100).toFixed(0)} $`;
}

export async function loadBenchmarks(marketSlug?: string): Promise<AppointmentBenchmark[]> {
  let query = supabase
    .from("appointment_pricing_benchmarks")
    .select("id, category_slug, market_slug, google_ads_cpl_cents, unpro_markup_percent, seasonal_multiplier, season_code, base_appointment_price_cents, final_appointment_price_cents")
    .eq("is_active", true)
    .eq("season_code", "default");

  if (marketSlug) {
    query = query.eq("market_slug", marketSlug);
  }

  const { data, error } = await query.order("category_slug");
  if (error) throw error;
  return (data || []) as AppointmentBenchmark[];
}

export async function loadSeasonalRules(): Promise<SeasonalRule[]> {
  const { data, error } = await supabase
    .from("seasonal_pricing_rules")
    .select("category_slug, season_code, month_start, month_end, multiplier, label_fr")
    .eq("is_active", true);
  if (error) throw error;
  return (data || []) as SeasonalRule[];
}

export function computeSeasonalPrices(
  benchmarks: AppointmentBenchmark[],
  seasonalRules: SeasonalRule[],
  currentMonth: number
): Array<AppointmentBenchmark & { seasonal_price_cents: number; season_label: string; season_multiplier: number }> {
  return benchmarks.map(b => {
    const rule = getCurrentSeason(currentMonth, seasonalRules, b.category_slug);
    const multiplier = rule?.multiplier ?? 1.0;
    const seasonalPrice = getSeasonalPrice(b.final_appointment_price_cents, multiplier);
    return {
      ...b,
      seasonal_price_cents: seasonalPrice,
      season_label: rule?.label_fr ?? "Prix standard",
      season_multiplier: multiplier,
    };
  });
}
