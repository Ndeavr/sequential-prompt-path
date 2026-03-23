/**
 * useAlexGodMode — React hook for Alex God Mode orchestration.
 * Evaluates context and provides the top-level decision.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { evaluateGodMode, type GodModeContext, type GodDecision } from "@/services/alexGodModeEngine";
import { logGodDecision } from "@/services/alexDecisionLog";

interface UseAlexGodModeOptions {
  hasScore?: boolean;
  hasPhoto?: boolean;
  hasBooking?: boolean;
  hasPlan?: boolean;
  hasProfile?: boolean;
  trustLevel?: number;
  frictionLevel?: number;
  momentum?: string;
  enabled?: boolean;
}

export function useAlexGodMode(options: UseAlexGodModeOptions = {}) {
  const { user, role } = useAuth();
  const { pathname } = useLocation();
  const [decision, setDecision] = useState<GodDecision | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const lastEvalRef = useRef<number>(0);

  const evaluate = useCallback(() => {
    if (options.enabled === false || !user?.id) return;

    // Throttle: max once per 5s
    const now = Date.now();
    if (now - lastEvalRef.current < 5000) return;
    lastEvalRef.current = now;

    const ctx: GodModeContext = {
      userId: user.id,
      role: role === "contractor" ? "contractor" : role === "admin" ? "admin" : "owner",
      currentPage: pathname,
      hasScore: options.hasScore ?? false,
      hasPhoto: options.hasPhoto ?? false,
      hasBooking: options.hasBooking ?? false,
      hasPlan: options.hasPlan ?? false,
      hasProfile: options.hasProfile ?? false,
      trustLevel: options.trustLevel ?? 50,
      frictionLevel: options.frictionLevel ?? 0,
      momentum: options.momentum ?? "cold",
      sessionHistory: [],
      activeWorkflow,
    };

    const result = evaluateGodMode(ctx);
    setDecision(result);

    // Log high-confidence decisions
    if (result.confidence > 0.7) {
      logGodDecision(user.id, result).catch(() => {});
    }

    // Track workflow activation
    if (result.type === "launch_workflow") {
      setActiveWorkflow(result.target);
    }
  }, [user, role, pathname, options, activeWorkflow]);

  useEffect(() => {
    evaluate();
  }, [pathname, options.hasScore, options.hasPhoto, options.hasBooking]);

  const completeWorkflow = useCallback(() => {
    setActiveWorkflow(null);
    setDecision(null);
  }, []);

  return {
    decision,
    activeWorkflow,
    evaluate,
    completeWorkflow,
    isActive: decision !== null && decision.type !== "wait",
  };
}
