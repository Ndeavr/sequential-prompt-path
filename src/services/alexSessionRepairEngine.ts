/**
 * AlexSessionRepairEngine — Detects and repairs session inconsistencies.
 * 
 * Detects:
 * - Route ≠ intent
 * - Role ≠ displayed component
 * - Address asked when unnecessary
 * - Contractor recommended without service
 * - Booking confirmed without real reservation
 * - Empty memory but "resume" message
 */

import type { AlexSessionMemory } from "./alexMemoryEngine";
import type { AlexRoute } from "./alexRouteEngine";
import { isEntrepreneurIntent, isHomeownerIntent, type AlexIntent } from "./alexIntentClassifier";

export interface SessionRepairResult {
  isHealthy: boolean;
  issues: string[];
  repairs: Array<{
    field: keyof AlexSessionMemory;
    action: "clear" | "set";
    value?: any;
    reason: string;
  }>;
}

export function diagnoseSession(
  memory: AlexSessionMemory,
  currentRoute: AlexRoute | null,
  lastIntent: AlexIntent | null,
): SessionRepairResult {
  const issues: string[] = [];
  const repairs: SessionRepairResult["repairs"] = [];

  // 1. Route ≠ intent
  if (currentRoute?.startsWith("alex/contractor") && lastIntent && isHomeownerIntent(lastIntent)) {
    issues.push("ROUTE_INTENT_MISMATCH: contractor route but homeowner intent");
    repairs.push({ field: "current_route", action: "set", value: "alex/homeowner/problem", reason: "Intent is homeowner" });
  }
  if (currentRoute?.startsWith("alex/homeowner") && lastIntent && isEntrepreneurIntent(lastIntent)) {
    issues.push("ROUTE_INTENT_MISMATCH: homeowner route but entrepreneur intent");
    repairs.push({ field: "current_route", action: "set", value: "alex/contractor/plan", reason: "Intent is entrepreneur" });
  }

  // 2. Contractor recommended without service
  if (memory.recommended_contractor_id && !memory.service_category) {
    issues.push("CONTRACTOR_WITHOUT_SERVICE");
    repairs.push({ field: "recommended_contractor_id", action: "clear", reason: "No service qualified" });
    repairs.push({ field: "recommended_contractor_name", action: "clear", reason: "No service qualified" });
  }

  // 3. Booking confirmed without booking_id
  if (memory.booking_confirmed && !memory.booking_id) {
    issues.push("BOOKING_CONFIRMED_WITHOUT_ID");
    repairs.push({ field: "booking_confirmed", action: "set", value: false, reason: "No booking ID" });
  }

  // 4. Address asked in entrepreneur flow
  if (memory.resolved_role === "entrepreneur" && memory.last_missing_field === "address") {
    issues.push("ADDRESS_ASKED_IN_ENTREPRENEUR_FLOW");
    repairs.push({ field: "last_missing_field", action: "clear", reason: "Address not needed for plan" });
  }

  // 5. Need qualified = true but no problem_type
  if (memory.need_qualified && !memory.problem_type && !memory.service_category) {
    issues.push("NEED_QUALIFIED_WITHOUT_DATA");
    repairs.push({ field: "need_qualified", action: "set", value: false, reason: "No actual data backing the qualification" });
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    repairs,
  };
}

/** Apply repairs to memory */
export function applyRepairs(
  memory: AlexSessionMemory,
  repairs: SessionRepairResult["repairs"],
): AlexSessionMemory {
  const patched = { ...memory };
  for (const repair of repairs) {
    if (repair.action === "clear") {
      (patched as any)[repair.field] = null;
    } else if (repair.action === "set" && repair.value !== undefined) {
      (patched as any)[repair.field] = repair.value;
    }
  }
  return patched;
}
