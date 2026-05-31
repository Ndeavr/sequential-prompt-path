/**
 * UNPRO AI Trust — Onboarding store
 * Holds the state across the 9-step cinematic audit funnel.
 */
import { create } from "zustand";

export type AuditStep =
  | "intro"
  | "identify"
  | "scanning"
  | "ai_perception"
  | "semantic_gap"
  | "review_intelligence"
  | "trust_position"
  | "territory"
  | "activate";

export const STEP_ORDER: AuditStep[] = [
  "intro",
  "identify",
  "scanning",
  "ai_perception",
  "semantic_gap",
  "review_intelligence",
  "trust_position",
  "territory",
  "activate",
];

export interface AuditInput {
  company_name?: string;
  website?: string;
  city?: string;
  specialty?: string;
  phone?: string;
}

export interface AuditResults {
  detected_identity?: string;
  detected_specialties?: string[];
  semantic_entities?: { label: string; type: string; strength: number }[];
  ai_confidence?: number;
  semantic_gap_score?: number;
  review_sentiment?: "trusted" | "neutral" | "at_risk" | "uncertain";
  review_signals?: string[];
  trust_position?: "authority" | "established" | "emerging" | "invisible";
  trust_score?: number;
  territory_slots_total?: number;
  territory_slots_taken?: number;
}

interface State {
  step: AuditStep;
  input: AuditInput;
  results: AuditResults;
  scanning: boolean;
  setStep: (s: AuditStep) => void;
  next: () => void;
  back: () => void;
  patchInput: (p: Partial<AuditInput>) => void;
  patchResults: (p: Partial<AuditResults>) => void;
  setScanning: (b: boolean) => void;
  reset: () => void;
}

export const useAiTrustAuditStore = create<State>((set, get) => ({
  step: "intro",
  input: {},
  results: {},
  scanning: false,
  setStep: (step) => set({ step }),
  next: () => {
    const i = STEP_ORDER.indexOf(get().step);
    if (i < STEP_ORDER.length - 1) set({ step: STEP_ORDER[i + 1] });
  },
  back: () => {
    const i = STEP_ORDER.indexOf(get().step);
    if (i > 0) set({ step: STEP_ORDER[i - 1] });
  },
  patchInput: (p) => set((s) => ({ input: { ...s.input, ...p } })),
  patchResults: (p) => set((s) => ({ results: { ...s.results, ...p } })),
  setScanning: (scanning) => set({ scanning }),
  reset: () => set({ step: "intro", input: {}, results: {}, scanning: false }),
}));
