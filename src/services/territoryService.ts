/**
 * UNPRO — Territory Service
 * Handles territory availability, slot checking, and lead distribution logic.
 * Updated to match new DB schema (slots_signature, slots_elite, etc.)
 */

export interface TerritorySlotConfig {
  slots_signature: number;
  slots_elite: number;
  slots_premium: number;
  slots_pro: number;
  slots_recrue: number;
  max_entrepreneurs: number;
}

export interface TerritoryOccupancy {
  occupied_signature: number;
  occupied_elite: number;
  occupied_premium: number;
  occupied_pro: number;
  occupied_recrue: number;
  occupied_total: number;
}

const PLAN_TO_SLOT: Record<string, string> = {
  signature: "signature",
  elite: "elite",
  premium: "premium",
  pro: "pro",
  recrue: "recrue",
};

export const getSlotTypeForPlan = (planId: string): string =>
  PLAN_TO_SLOT[planId] ?? "recrue";

export const computeOccupancy = (
  assignments: Array<{ slot_type: string; active: boolean }>
): TerritoryOccupancy => {
  const active = assignments.filter((a) => a.active);
  return {
    occupied_signature: active.filter((a) => a.slot_type === "signature").length,
    occupied_elite: active.filter((a) => a.slot_type === "elite").length,
    occupied_premium: active.filter((a) => a.slot_type === "premium").length,
    occupied_pro: active.filter((a) => a.slot_type === "pro").length,
    occupied_recrue: active.filter((a) => a.slot_type === "recrue").length,
    occupied_total: active.length,
  };
};

export const hasAvailableSlot = (
  config: TerritorySlotConfig,
  occupancy: TerritoryOccupancy,
  slotType: string
): boolean => {
  if (slotType === "signature") return occupancy.occupied_signature < config.slots_signature;
  if (slotType === "elite") return occupancy.occupied_elite < config.slots_elite;
  if (slotType === "premium") return occupancy.occupied_premium < config.slots_premium;
  if (slotType === "pro") return occupancy.occupied_pro < config.slots_pro;
  if (slotType === "recrue") return occupancy.occupied_recrue < config.slots_recrue;
  return false;
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
    signature: 5,
    elite: 4,
    premium: 3,
    pro: 2,
    recrue: 1,
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
