/**
 * UNPRO — Reliability: explicit state machines (Rule 3)
 * Forbid silent/implicit transitions. Throw on invalid moves.
 */

export interface StateMachineDef<S extends string> {
  initial: S;
  transitions: Partial<Record<S, readonly S[]>>;
}

export function createStateMachine<S extends string>(def: StateMachineDef<S>) {
  return {
    initial: def.initial,
    canTransition(from: S, to: S): boolean {
      return def.transitions[from]?.includes(to) ?? false;
    },
    assertTransition(from: S, to: S): void {
      if (!this.canTransition(from, to)) {
        throw new Error(`Invalid state transition: ${from} → ${to}`);
      }
    },
    allStates(): S[] {
      return Array.from(new Set([def.initial, ...Object.keys(def.transitions) as S[]]));
    },
  };
}

/** Canonical lead pipeline states (Rule 3 example). */
export const LeadPipelineStates = [
  "DISCOVERED", "ENRICHING", "ENRICHED",
  "SCORING", "SCORED",
  "MESSAGING", "SENT", "DELIVERED",
  "REPLIED", "QUALIFIED",
  "CHECKOUT_SENT", "PAID", "ACTIVATED",
  "BLOCKED", "FAILED",
] as const;
export type LeadPipelineState = typeof LeadPipelineStates[number];
