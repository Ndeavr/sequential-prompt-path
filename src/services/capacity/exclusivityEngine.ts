/**
 * UNPRO — Exclusivity Engine
 * Determines slot-class eligibility (signature, elite, premium...) for a zone.
 */
import type { CapacityResult } from "./capacityEngine";
import type { CpcTier } from "./cpcTierService";

export type SlotClass = "signature" | "elite" | "premium" | "pro" | "recrue";
export type SlotStatus = "open" | "limited" | "locked";

export interface ExclusivityRule {
  slot_class: SlotClass;
  min_saturation: number;
  required_cpc_tiers: CpcTier[];
  min_gap_score: number;
  conditions: Record<string, unknown>;
}

export interface ExclusivityInput {
  capacity: CapacityResult;
  rules: ExclusivityRule[];
  gapScore?: number;
  takenBySlot?: Partial<Record<SlotClass, number>>;
}

export interface SlotEvaluation {
  slot_class: SlotClass;
  status: SlotStatus;
  remaining: number;
  eligible: boolean;
  justification: string;
}

const MAX_BY_SLOT: Record<SlotClass, (cap: number) => number> = {
  signature: () => 1,
  elite:     () => 2,
  premium:   (cap) => Math.max(2, Math.round(cap * 0.25)),
  pro:       (cap) => Math.max(3, Math.round(cap * 0.45)),
  recrue:    (cap) => Math.max(2, Math.round(cap * 0.30)),
};

export function evaluateExclusivity(input: ExclusivityInput): SlotEvaluation[] {
  const { capacity, rules, gapScore = 0, takenBySlot = {} } = input;

  return rules.map((rule) => {
    const tierOk = rule.required_cpc_tiers.includes(capacity.cpcTier);
    const satOk = capacity.saturationScore >= rule.min_saturation;
    const gapOk = gapScore >= rule.min_gap_score;
    const eligible = tierOk && satOk && gapOk;

    const maxForSlot = MAX_BY_SLOT[rule.slot_class](capacity.finalCap);
    const taken = takenBySlot[rule.slot_class] ?? 0;
    const remaining = Math.max(0, maxForSlot - taken);

    let status: SlotStatus;
    if (!eligible || remaining === 0) status = "locked";
    else if (remaining <= Math.ceil(maxForSlot * 0.3)) status = "limited";
    else status = "open";

    const justification = eligible
      ? `Saturation ${capacity.saturationScore}% · CPC ${capacity.cpcTier} · ${remaining}/${maxForSlot} libres`
      : `Conditions non rencontrées (sat ${capacity.saturationScore}%, CPC ${capacity.cpcTier})`;

    return { slot_class: rule.slot_class, status, remaining, eligible, justification };
  });
}

export function publicStatusLabelFr(status: SlotStatus, slot: SlotClass): string {
  if (status === "locked") return "Complet — liste d'attente";
  if (status === "limited") return `Places ${slot.charAt(0).toUpperCase() + slot.slice(1)} limitées`;
  return "Disponible";
}
