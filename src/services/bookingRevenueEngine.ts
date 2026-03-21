/**
 * UNPRO Booking Intelligence — Revenue Engine
 * Monetization, dynamic pricing, revenue split, slot value scoring.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Constants ───

export const UNPRO_FEE_RATE = 0.30; // 30%

export const DYNAMIC_PRICING_RULES = {
  urgency_premium: 0.25,
  same_day_premium: 0.15,
  far_distance_premium: 0.10,
  high_demand_premium: 0.20,
  weekend_premium: 0.10,
  evening_premium: 0.05,
} as const;

// ─── Types ───

export interface RevenueSplit {
  totalCents: number;
  unproFeeCents: number;
  contractorAmountCents: number;
  feeRate: number;
}

export interface DynamicPriceResult {
  basePriceCents: number;
  adjustedPriceCents: number;
  appliedRules: { rule: string; multiplier: number; label_fr: string }[];
  totalMultiplier: number;
}

export interface SlotValueScore {
  score: number;
  estimatedJobValueCents: number;
  closeProbability: number;
  travelEfficiency: number;
  urgencyBonus: number;
  dnaMatchScore: number;
  breakdown: Record<string, number>;
}

export interface BookingTransaction {
  id: string;
  booking_id: string | null;
  contractor_id: string;
  amount_total_cents: number;
  unpro_fee_cents: number;
  contractor_amount_cents: number;
  fee_rate: number;
  status: string;
  created_at: string;
}

export interface PricingRule {
  id: string;
  contractor_id: string;
  rule_type: string;
  rule_key: string;
  value: number;
  description_fr: string | null;
  is_active: boolean;
}

// ─── Revenue Split Calculator ───

export function calculateRevenueSplit(totalCents: number, feeRate = UNPRO_FEE_RATE): RevenueSplit {
  const unproFeeCents = Math.round(totalCents * feeRate);
  return {
    totalCents,
    unproFeeCents,
    contractorAmountCents: totalCents - unproFeeCents,
    feeRate,
  };
}

// ─── Dynamic Pricing ───

export function calculateDynamicPrice(input: {
  basePriceCents: number;
  urgencyLevel?: string;
  isSameDay?: boolean;
  distanceKm?: number;
  demandLevel?: "low" | "normal" | "high" | "surge";
  dayOfWeek?: number;
  hour?: number;
  contractorRules?: PricingRule[];
}): DynamicPriceResult {
  const appliedRules: DynamicPriceResult["appliedRules"] = [];
  let totalMultiplier = 1.0;

  // Urgency
  if (input.urgencyLevel === "urgent" || input.urgencyLevel === "emergency") {
    const m = 1 + DYNAMIC_PRICING_RULES.urgency_premium;
    totalMultiplier *= m;
    appliedRules.push({ rule: "urgency", multiplier: m, label_fr: "Urgence (+25%)" });
  }

  // Same day
  if (input.isSameDay) {
    const m = 1 + DYNAMIC_PRICING_RULES.same_day_premium;
    totalMultiplier *= m;
    appliedRules.push({ rule: "same_day", multiplier: m, label_fr: "Même jour (+15%)" });
  }

  // Distance
  if (input.distanceKm && input.distanceKm > 30) {
    const m = 1 + DYNAMIC_PRICING_RULES.far_distance_premium;
    totalMultiplier *= m;
    appliedRules.push({ rule: "distance", multiplier: m, label_fr: "Distance éloignée (+10%)" });
  }

  // Demand
  if (input.demandLevel === "high") {
    const m = 1 + DYNAMIC_PRICING_RULES.high_demand_premium * 0.5;
    totalMultiplier *= m;
    appliedRules.push({ rule: "demand_high", multiplier: m, label_fr: "Forte demande (+10%)" });
  } else if (input.demandLevel === "surge") {
    const m = 1 + DYNAMIC_PRICING_RULES.high_demand_premium;
    totalMultiplier *= m;
    appliedRules.push({ rule: "demand_surge", multiplier: m, label_fr: "Très forte demande (+20%)" });
  }

  // Weekend
  if (input.dayOfWeek !== undefined && (input.dayOfWeek === 0 || input.dayOfWeek === 6)) {
    const m = 1 + DYNAMIC_PRICING_RULES.weekend_premium;
    totalMultiplier *= m;
    appliedRules.push({ rule: "weekend", multiplier: m, label_fr: "Fin de semaine (+10%)" });
  }

  // Contractor custom rules
  if (input.contractorRules) {
    for (const rule of input.contractorRules.filter((r) => r.is_active)) {
      if (rule.rule_type === "multiplier") {
        totalMultiplier *= rule.value;
        appliedRules.push({
          rule: rule.rule_key,
          multiplier: rule.value,
          label_fr: rule.description_fr ?? rule.rule_key,
        });
      }
    }
  }

  const adjustedPriceCents = Math.round(input.basePriceCents * totalMultiplier);

  return {
    basePriceCents: input.basePriceCents,
    adjustedPriceCents,
    appliedRules,
    totalMultiplier,
  };
}

// ─── Slot Value Scoring ───

export function calculateSlotValue(input: {
  estimatedJobValueCents?: number;
  closeProbability?: number;
  travelEfficiencyScore?: number;
  urgencyLevel?: string;
  dnaMatchScore?: number;
  appointmentPriceCents?: number;
  appointmentIsPaid?: boolean;
}): SlotValueScore {
  const breakdown: Record<string, number> = {};
  let score = 0;

  // Job value component (0-30)
  const jobVal = input.estimatedJobValueCents ?? 0;
  const jobScore = Math.min(30, (jobVal / 100000) * 30); // 1000$ = max
  breakdown.job_value = jobScore;
  score += jobScore;

  // Close probability (0-25)
  const closeProb = input.closeProbability ?? 0.3;
  const closeScore = closeProb * 25;
  breakdown.close_probability = closeScore;
  score += closeScore;

  // Travel efficiency (0-15)
  const travelScore = (input.travelEfficiencyScore ?? 0.5) * 15;
  breakdown.travel_efficiency = travelScore;
  score += travelScore;

  // Urgency bonus (0-15)
  let urgencyBonus = 0;
  if (input.urgencyLevel === "emergency") urgencyBonus = 15;
  else if (input.urgencyLevel === "urgent") urgencyBonus = 10;
  else if (input.urgencyLevel === "high") urgencyBonus = 5;
  breakdown.urgency_bonus = urgencyBonus;
  score += urgencyBonus;

  // DNA match (0-10)
  const dnaScore = ((input.dnaMatchScore ?? 50) / 100) * 10;
  breakdown.dna_match = dnaScore;
  score += dnaScore;

  // Paid appointment bonus (0-5)
  if (input.appointmentIsPaid && input.appointmentPriceCents && input.appointmentPriceCents > 0) {
    breakdown.paid_bonus = 5;
    score += 5;
  }

  return {
    score: Math.round(Math.min(100, score)),
    estimatedJobValueCents: jobVal,
    closeProbability: closeProb,
    travelEfficiency: input.travelEfficiencyScore ?? 0.5,
    urgencyBonus,
    dnaMatchScore: input.dnaMatchScore ?? 50,
    breakdown,
  };
}

// ─── Format Helpers ───

export function formatCentsToCAD(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(/\.00$/, "")} $`;
}

export function formatCentsShort(cents: number): string {
  return `${Math.round(cents / 100)} $`;
}

// ─── Data Fetchers ───

export async function fetchBookingTransactions(
  contractorId: string,
  limit = 50
): Promise<BookingTransaction[]> {
  const { data, error } = await supabase
    .from("booking_transactions")
    .select("*")
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as BookingTransaction[];
}

export async function fetchPricingRules(contractorId: string): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from("booking_pricing_rules")
    .select("*")
    .eq("contractor_id", contractorId)
    .order("rule_type");
  if (error) throw error;
  return (data ?? []) as unknown as PricingRule[];
}

export async function createBookingTransaction(input: {
  bookingId: string;
  contractorId: string;
  totalCents: number;
  feeRate?: number;
}): Promise<BookingTransaction> {
  const split = calculateRevenueSplit(input.totalCents, input.feeRate);

  const { data, error } = await supabase
    .from("booking_transactions")
    .insert({
      booking_id: input.bookingId,
      contractor_id: input.contractorId,
      amount_total_cents: split.totalCents,
      unpro_fee_cents: split.unproFeeCents,
      contractor_amount_cents: split.contractorAmountCents,
      fee_rate: split.feeRate,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as BookingTransaction;
}

// ─── Revenue Analytics ───

export interface RevenueAnalytics {
  totalRevenueCents: number;
  totalUnproFeeCents: number;
  totalContractorCents: number;
  transactionCount: number;
  avgBookingValueCents: number;
  paidBookingCount: number;
  freeBookingCount: number;
  paidRatio: number;
}

export function computeRevenueAnalytics(transactions: BookingTransaction[]): RevenueAnalytics {
  const paid = transactions.filter((t) => t.amount_total_cents > 0);
  const totalRevenueCents = transactions.reduce((s, t) => s + t.amount_total_cents, 0);
  const totalUnproFeeCents = transactions.reduce((s, t) => s + t.unpro_fee_cents, 0);
  const totalContractorCents = transactions.reduce((s, t) => s + t.contractor_amount_cents, 0);

  return {
    totalRevenueCents,
    totalUnproFeeCents,
    totalContractorCents,
    transactionCount: transactions.length,
    avgBookingValueCents: transactions.length > 0 ? Math.round(totalRevenueCents / transactions.length) : 0,
    paidBookingCount: paid.length,
    freeBookingCount: transactions.length - paid.length,
    paidRatio: transactions.length > 0 ? paid.length / transactions.length : 0,
  };
}
