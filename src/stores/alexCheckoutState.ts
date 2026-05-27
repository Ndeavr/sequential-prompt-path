/**
 * alexCheckoutState — Global Zustand store driving the continuous Alex narration
 * across the contractor funnel (import → analyse → AIPP → plans → checkout → activation).
 *
 * Pure state. No side effects. No TTS. The FloatingAlexGuide component reads
 * `stage` + `context` and renders contextual messages.
 */
import { create } from "zustand";

export type AlexFunnelStage =
  | "idle"
  | "importing"
  | "analyzing"
  | "scoring"
  | "recommending"
  | "hesitating"
  | "trial_offer"
  | "checkout"
  | "payment_processing"
  | "activation_success";

export interface AlexFunnelContext {
  companyName?: string;
  city?: string;
  score?: number;
  potentialScore?: number;
  recommendedPlan?: string;
  hesitationCount: number;
  lastInteractionAt: number;
}

interface AlexCheckoutState {
  stage: AlexFunnelStage;
  context: AlexFunnelContext;
  visible: boolean;
  setStage: (stage: AlexFunnelStage, ctx?: Partial<AlexFunnelContext>) => void;
  patchContext: (ctx: Partial<AlexFunnelContext>) => void;
  pingInteraction: () => void;
  bumpHesitation: () => void;
  show: () => void;
  hide: () => void;
  reset: () => void;
}

const initialContext: AlexFunnelContext = {
  hesitationCount: 0,
  lastInteractionAt: Date.now(),
};

export const useAlexCheckoutState = create<AlexCheckoutState>((set) => ({
  stage: "idle",
  context: initialContext,
  visible: true,
  setStage: (stage, ctx) =>
    set((s) => ({
      stage,
      context: { ...s.context, ...(ctx ?? {}), lastInteractionAt: Date.now() },
    })),
  patchContext: (ctx) =>
    set((s) => ({ context: { ...s.context, ...ctx } })),
  pingInteraction: () =>
    set((s) => ({ context: { ...s.context, lastInteractionAt: Date.now() } })),
  bumpHesitation: () =>
    set((s) => ({
      context: { ...s.context, hesitationCount: s.context.hesitationCount + 1 },
    })),
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
  reset: () => set({ stage: "idle", context: initialContext, visible: true }),
}));
