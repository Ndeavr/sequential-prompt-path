/**
 * UNPRO — Territory Service
 * Handles territory availability, slot checking, and lead distribution logic.
 */

export interface TerritorySlotConfig {
  signature_slots: number;
  elite_slots: number;
  premium_slots: number;
  max_contractors: number;
}

export interface TerritoryOccupancy {
  signature_used: number;
  elite_used: number;
  premium_used: number;
  standard_used: number;
  total_used: number;
}

const PLAN_TO_SLOT: Record<string, string> = {
  signature: "signature",
  elite: "elite",
  premium: "premium",
  pro: "standard",
  recrue: "standard",
};

export const getSlotTypeForPlan = (planId: string): string =>
  PLAN_TO_SLOT[planId] ?? "standard";

export const computeOccupancy = (
  assignments: Array<{ slot_type: string; active: boolean }>
): TerritoryOccupancy => {
  const active = assignments.filter((a) => a.active);
  return {
    signature_used: active.filter((a) => a.slot_type === "signature").length,
    elite_used: active.filter((a) => a.slot_type === "elite").length,
    premium_used: active.filter((a) => a.slot_type === "premium").length,
    standard_used: active.filter((a) => a.slot_type === "standard").length,
    total_used: active.length,
  };
};

export const hasAvailableSlot = (
  config: TerritorySlotConfig,
  occupancy: TerritoryOccupancy,
  slotType: string
): boolean => {
  if (slotType === "signature") return occupancy.signature_used < config.signature_slots;
  if (slotType === "elite") return occupancy.elite_used < config.elite_slots;
  if (slotType === "premium") return occupancy.premium_used < config.premium_slots;
  // Standard: limited by max_contractors minus all occupied slots
  const reservedSlots = config.signature_slots + config.elite_slots + config.premium_slots;
  const standardCap = config.max_contractors - reservedSlots;
  return occupancy.standard_used < standardCap;
};

export const getDemandLevel = (occupancyRatio: number): string => {
  if (occupancyRatio >= 0.8) return "Élevée";
  if (occupancyRatio >= 0.5) return "Moyenne";
  return "Faible";
};

/**
 * Rank contractors for lead distribution within a territory.
 * Higher priority plans come first, then by AIPP score.
 */
export const rankContractorsForLead = (
  contractors: Array<{
    contractor_id: string;
    slot_type: string;
    aipp_score?: number | null;
  }>
): string[] => {
  const slotPriority: Record<string, number> = {
    signature: 4,
    elite: 3,
    premium: 2,
    standard: 1,
  };

  return contractors
    .sort((a, b) => {
      const pa = slotPriority[a.slot_type] ?? 0;
      const pb = slotPriority[b.slot_type] ?? 0;
      if (pa !== pb) return pb - pa;
      return (b.aipp_score ?? 0) - (a.aipp_score ?? 0);
    })
    .map((c) => c.contractor_id);
};
