/**
 * Contractor flow state — profile, AIPP, goals, plan.
 */
import { create } from "zustand";

export interface ContractorProfile {
  business_name?: string;
  phone?: string;
  website?: string;
  rbq?: string;
  neq?: string;
  logo_url?: string;
  google_rating?: number;
  google_reviews_count?: number;
  services?: string[];
  cities_served?: string[];
  profile_completion?: number;
}

export interface AippReport {
  aipp_score: number;
  tier: string;
  strengths: string[];
  weaknesses: string[];
  fastest_improvements: string[];
}

export interface ContractorGoals {
  desired_appointments?: number;
  priority_services?: string[];
  priority_cities?: string[];
  availability_notes?: string;
}

export interface PlanRecommendation {
  recommended_plan: string;
  reason: string;
  expected_appointments?: number;
  monthly_price?: number;
}

interface State {
  profile: ContractorProfile | null;
  aipp: AippReport | null;
  goals: ContractorGoals;
  plan: PlanRecommendation | null;
  loading: boolean;
  setProfile: (p: ContractorProfile) => void;
  setAipp: (a: AippReport) => void;
  setGoals: (g: Partial<ContractorGoals>) => void;
  setPlan: (p: PlanRecommendation) => void;
  setLoading: (b: boolean) => void;
  reset: () => void;
}

export const useContractorStore = create<State>((set) => ({
  profile: null,
  aipp: null,
  goals: {},
  plan: null,
  loading: false,
  setProfile: (profile) => set({ profile }),
  setAipp: (aipp) => set({ aipp }),
  setGoals: (g) => set((s) => ({ goals: { ...s.goals, ...g } })),
  setPlan: (plan) => set({ plan }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ profile: null, aipp: null, goals: {}, plan: null, loading: false }),
}));
