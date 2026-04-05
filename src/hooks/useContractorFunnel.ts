/**
 * UNPRO — useContractorFunnel
 * Central hook managing the contractor onboarding funnel state.
 * Persists to sessionStorage + Supabase.
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  type ContractorFunnelState,
  type FunnelStep,
  DEFAULT_FUNNEL_STATE,
  FUNNEL_STEPS,
} from "@/types/contractorFunnel";

const STORAGE_KEY = "unpro_contractor_funnel";

const STEP_ROUTES: Record<FunnelStep, string> = {
  landing: "/entrepreneur/join",
  onboarding_start: "/entrepreneur/onboarding",
  import_workspace: "/entrepreneur/import",
  aipp_builder: "/entrepreneur/aipp-builder",
  assets_studio: "/entrepreneur/assets",
  faq_builder: "/entrepreneur/faq",
  plan_recommendation: "/entrepreneur/plan",
  checkout: "/entrepreneur/checkout",
  activation: "/entrepreneur/activation",
};

function loadState(): ContractorFunnelState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_FUNNEL_STATE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_FUNNEL_STATE };
}

function saveState(state: ContractorFunnelState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export const useContractorFunnel = () => {
  const [state, setState] = useState<ContractorFunnelState>(loadState);
  const navigate = useNavigate();

  // Auto-save on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updates: Partial<ContractorFunnelState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: FunnelStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
    navigate(STEP_ROUTES[step]);
  }, [navigate]);

  const nextStep = useCallback(() => {
    const currentIdx = FUNNEL_STEPS.indexOf(state.currentStep);
    if (currentIdx < FUNNEL_STEPS.length - 1) {
      goToStep(FUNNEL_STEPS[currentIdx + 1]);
    }
  }, [state.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    const currentIdx = FUNNEL_STEPS.indexOf(state.currentStep);
    if (currentIdx > 0) {
      goToStep(FUNNEL_STEPS[currentIdx - 1]);
    }
  }, [state.currentStep, goToStep]);

  const resetFunnel = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({ ...DEFAULT_FUNNEL_STATE });
  }, []);

  const stepIndex = FUNNEL_STEPS.indexOf(state.currentStep);
  const progress = Math.round((stepIndex / (FUNNEL_STEPS.length - 1)) * 100);

  return {
    state,
    updateState,
    goToStep,
    nextStep,
    prevStep,
    resetFunnel,
    stepIndex,
    progress,
    totalSteps: FUNNEL_STEPS.length,
    currentRoute: STEP_ROUTES[state.currentStep],
  };
};
