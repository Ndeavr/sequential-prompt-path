import { create } from "zustand";
import type { BusinessGoal } from "@/features/scanIA/growthPlanEngine";
import type { ContractorPlanSlug } from "@/config/contractorPlans";

export interface ScanReportRow {
  id: string;
  session_token: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  overall_score: number;
  sub_scores: Record<string, number>;
  opportunities: any;
  threats: any;
  alex_simulation: any;
  signals: any;
  company_reveal: any;
  market_position: any;
  territory_demand: any[];
  today_jobs_per_month: number | null;
  user_goal: string | null;
  user_capacity: number | null;
  recommended_plan: string | null;
}

interface WizardState {
  report: ScanReportRow | null;
  step: number;
  goal: BusinessGoal | null;
  capacity: number;
  selectedPlan: ContractorPlanSlug | null;
  setReport: (r: ScanReportRow) => void;
  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  setGoal: (g: BusinessGoal) => void;
  setCapacity: (c: number) => void;
  setSelectedPlan: (p: ContractorPlanSlug | null) => void;
}

export const TOTAL_STEPS = 11;

export const useScanWizardState = create<WizardState>((set, get) => ({
  report: null,
  step: 1,
  goal: null,
  capacity: 10,
  selectedPlan: null,
  setReport: (r) => set({ report: r, capacity: r.user_capacity ?? 10, goal: (r.user_goal as BusinessGoal) ?? null }),
  setStep: (s) => set({ step: Math.max(1, Math.min(TOTAL_STEPS, s)) }),
  next: () => set({ step: Math.min(TOTAL_STEPS, get().step + 1) }),
  prev: () => set({ step: Math.max(1, get().step - 1) }),
  setGoal: (g) => set({ goal: g }),
  setCapacity: (c) => set({ capacity: c }),
  setSelectedPlan: (p) => set({ selectedPlan: p }),
}));
