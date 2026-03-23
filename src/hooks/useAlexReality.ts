/**
 * useAlexReality — Hook wiring the Reality Engine into the app.
 * Periodically evaluates context and produces proactive suggestions
 * with built-in safety: cooldown, ignore tracking, rate limiting.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import {
  predictNeeds,
  getCurrentSeason,
  type RealitySignals,
  type RealityPrediction,
} from "@/services/alexRealityEngine";

interface UseAlexRealityOptions {
  hasScore?: boolean;
  hasPhoto?: boolean;
  hasBooking?: boolean;
  hasPlan?: boolean;
  hasProfile?: boolean;
  propertyAge?: number;
  propertyType?: string;
  weatherHint?: RealitySignals["weatherHint"];
  enabled?: boolean;
}

export function useAlexReality(options: UseAlexRealityOptions = {}) {
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  const [prediction, setPrediction] = useState<RealityPrediction | null>(null);
  const [isActive, setIsActive] = useState(false);

  const ignoredCountRef = useRef(0);
  const lastSuggestionAtRef = useRef<number | null>(null);
  const lastUserActionAtRef = useRef<number | null>(null);
  const evalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mapRole = useCallback((): RealitySignals["role"] => {
    if (role === "contractor") return "contractor";
    if (role === "admin") return "admin";
    return "homeowner";
  }, [role]);

  const evaluate = useCallback(() => {
    const now = new Date();
    const signals: RealitySignals = {
      season: getCurrentSeason(),
      month: now.getMonth() + 1,
      localHour: now.getHours(),
      weatherHint: options.weatherHint,
      propertyAge: options.propertyAge,
      propertyType: options.propertyType,
      hasScore: options.hasScore ?? false,
      hasPhoto: options.hasPhoto ?? false,
      hasBooking: options.hasBooking ?? false,
      hasPlan: options.hasPlan ?? false,
      hasProfile: options.hasProfile ?? false,
      ignoredSuggestions: ignoredCountRef.current,
      lastSuggestionAt: lastSuggestionAtRef.current,
      lastUserActionAt: lastUserActionAtRef.current,
      role: mapRole(),
    };

    const result = predictNeeds(signals);

    if (result) {
      setPrediction(result);
      setIsActive(true);
      lastSuggestionAtRef.current = Date.now();
    }
  }, [options, mapRole]);

  // Periodic evaluation (every 45s)
  useEffect(() => {
    if (options.enabled === false) return;

    // Initial evaluation after 5s
    const timeout = setTimeout(evaluate, 5000);

    // Then every 45s
    evalIntervalRef.current = setInterval(evaluate, 45_000);

    return () => {
      clearTimeout(timeout);
      if (evalIntervalRef.current) clearInterval(evalIntervalRef.current);
    };
  }, [evaluate, options.enabled]);

  // Re-evaluate on page change
  useEffect(() => {
    if (options.enabled === false) return;
    const timeout = setTimeout(evaluate, 2000);
    return () => clearTimeout(timeout);
  }, [pathname, evaluate, options.enabled]);

  const dismiss = useCallback(() => {
    ignoredCountRef.current += 1;
    setPrediction(null);
    setIsActive(false);
  }, []);

  const act = useCallback(() => {
    lastUserActionAtRef.current = Date.now();
    ignoredCountRef.current = 0; // Reset ignore count on action
    const current = prediction;
    setPrediction(null);
    setIsActive(false);
    return current?.uiActions ?? null;
  }, [prediction]);

  const resetIgnored = useCallback(() => {
    ignoredCountRef.current = 0;
  }, []);

  return {
    prediction,
    isActive,
    dismiss,
    act,
    resetIgnored,
  };
}
