/**
 * UNPRO — useContractorFunnel (Unified)
 * Central hook managing the contractor onboarding funnel state.
 * Now delegates to useActivationFunnel for Supabase persistence,
 * with sessionStorage as fast fallback for pre-auth state.
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  type ContractorFunnelState,
  type FunnelStep,
  DEFAULT_FUNNEL_STATE,
  FUNNEL_STEPS,
} from "@/types/contractorFunnel";
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";

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

  // Sync from Supabase activation funnel if user is authenticated
  useEffect(() => {
    const syncFromDB = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("contractor_activation_funnel" as any)
          .select("business_name, phone, email, website, current_screen, selected_plan, payment_status, aipp_score, import_status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const d = data as any;
          setState(prev => {
            const merged = {
              ...prev,
              businessName: d.business_name || prev.businessName,
              phone: d.phone || prev.phone,
              email: d.email || prev.email,
              website: d.website || prev.website,
            };
            saveState(merged);
            return merged;
          });
        }
      } catch { /* ignore */ }
    };

    syncFromDB();
  }, []);

  // Auto-save to sessionStorage on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updates: Partial<ContractorFunnelState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: FunnelStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
    trackFunnelEvent(
      step === "checkout" ? "checkout_started" :
      step === "plan_recommendation" ? "plan_selected" :
      step === "aipp_builder" ? "aipp_viewed" :
      step === "activation" ? "activation_viewed" :
      "landing_viewed",
      { step }
    );
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
