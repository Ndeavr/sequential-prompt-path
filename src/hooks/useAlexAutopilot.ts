/**
 * useAlexAutopilot — React hook for Alex Autopilot Mode
 * Continuously evaluates context and provides next-best-action suggestions.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import {
  evaluateAutopilot,
  type AutopilotInput,
  type AutopilotOutput,
  type FrictionSignal,
  type IntentSignal,
  type UserRole,
} from "@/services/alexAutopilotEngine";

interface UseAlexAutopilotOptions {
  activePropertyId?: string | null;
  hasScore?: boolean;
  hasUploadedPhoto?: boolean;
  hasPendingBooking?: boolean;
  selectedPlan?: string | null;
  selectedContractorId?: string | null;
  enabled?: boolean;
}

export function useAlexAutopilot(options: UseAlexAutopilotOptions = {}) {
  const { user, role, isAuthenticated } = useAuth();
  const location = useLocation();
  const [output, setOutput] = useState<AutopilotOutput | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const frictionSignalsRef = useRef<FrictionSignal[]>([]);
  const intentSignalsRef = useRef<IntentSignal[]>([]);
  const interactionCountRef = useRef(0);

  const mapRole = useCallback((): UserRole => {
    if (role === "contractor") return "contractor";
    if (role === "admin") return "admin";
    return "owner";
  }, [role]);

  const evaluate = useCallback(() => {
    if (options.enabled === false) return;

    const input: AutopilotInput = {
      userId: user?.id ?? null,
      role: mapRole(),
      firstName: user?.user_metadata?.first_name ?? null,
      isReturningUser: interactionCountRef.current > 0,
      currentPage: location.pathname,
      visibleSection: undefined,
      activePropertyId: options.activePropertyId ?? null,
      hasScore: options.hasScore ?? false,
      hasUploadedPhoto: options.hasUploadedPhoto ?? false,
      hasPendingBooking: options.hasPendingBooking ?? false,
      selectedPlan: options.selectedPlan ?? null,
      selectedContractorId: options.selectedContractorId ?? null,
      lastTopic: null,
      lastQuestion: null,
      emotionalHints: [],
      frictionSignals: frictionSignalsRef.current,
      intentSignals: intentSignalsRef.current,
    };

    const result = evaluateAutopilot(input);
    setOutput(result);
    setDismissed(false);
  }, [user, mapRole, location.pathname, options]);

  // Re-evaluate on route change or option changes
  useEffect(() => {
    evaluate();
  }, [location.pathname, options.hasScore, options.hasUploadedPhoto, options.hasPendingBooking, options.selectedPlan]);

  const addFriction = useCallback((signal: FrictionSignal) => {
    frictionSignalsRef.current = [...frictionSignalsRef.current, signal];
    evaluate();
  }, [evaluate]);

  const addIntent = useCallback((signal: IntentSignal) => {
    intentSignalsRef.current = [...intentSignalsRef.current, signal];
    evaluate();
  }, [evaluate]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const act = useCallback(() => {
    if (!output) return;
    interactionCountRef.current++;
    // UI actions are returned to be dispatched by the consuming component
    return output.uiActions;
  }, [output]);

  return {
    suggestion: dismissed ? null : output,
    evaluate,
    dismiss,
    act,
    addFriction,
    addIntent,
    isActive: !dismissed && output !== null && output.confidenceScore > 0.4,
  };
}
