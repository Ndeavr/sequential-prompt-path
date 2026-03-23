/**
 * useAlexEvolution — React hook for Alex self-evolution tracking.
 * Lightweight: logs interactions, evaluates decisions, applies tuning.
 * Never blocks UX. All operations are fire-and-forget.
 */
import { useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import {
  logInteraction,
  evaluateDecision,
  recordPattern,
  optimizeResponse,
  getTuning,
  trackConversion,
  type InteractionLog,
  type DecisionScore,
} from "@/services/alexSelfEvolution";

export function useAlexEvolution() {
  const { user, role } = useAuth();
  const { pathname } = useLocation();
  const sessionIdRef = useRef(`s_${Date.now()}`);
  const turnStartRef = useRef<number>(0);

  /** Mark turn start (call when user sends message) */
  const startTurn = useCallback(() => {
    turnStartRef.current = Date.now();
  }, []);

  /** Log a complete interaction turn */
  const logTurn = useCallback(async (
    alexText: string,
    userResponse?: string,
    actionTaken?: string,
    success?: boolean,
    conversionType?: string,
  ) => {
    const timeToAction = turnStartRef.current > 0
      ? Date.now() - turnStartRef.current
      : undefined;

    const log: InteractionLog = {
      userId: user?.id,
      role: role ?? undefined,
      alexText,
      userResponse,
      actionTaken,
      success,
      conversionType,
      timeToActionMs: timeToAction,
      sessionId: sessionIdRef.current,
      page: pathname,
    };

    // Fire-and-forget
    logInteraction(log);

    // Evaluate and record pattern
    const score = evaluateDecision(log);
    if (actionTaken) {
      recordPattern(`action:${actionTaken}`, success ?? false);
    }
    recordPattern(`page:${pathname}`, score.overall > 0.5);

    // Track conversion
    if (conversionType && success) {
      trackConversion(user?.id ?? "anon", conversionType);
    }

    return score;
  }, [user, role, pathname]);

  /** Optimize Alex response text (safety-bounded) */
  const optimize = useCallback((text: string): string => {
    return optimizeResponse(text);
  }, []);

  /** Get current tuning params */
  const fetchTuning = useCallback(async () => {
    return getTuning(role ?? "homeowner");
  }, [role]);

  return {
    startTurn,
    logTurn,
    optimize,
    fetchTuning,
    sessionId: sessionIdRef.current,
  };
}
