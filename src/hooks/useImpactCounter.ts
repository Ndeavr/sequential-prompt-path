/**
 * useImpactCounter — Smooth animated counter with per-second interpolation.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { computeSnapshot, SCENARIO_CONFIGS, type CounterSnapshot, type CounterModelConfig } from "@/lib/counterEngine";

export function useImpactCounter(scenario: string = "realiste") {
  const cfg = SCENARIO_CONFIGS[scenario] ?? SCENARIO_CONFIGS.realiste;
  const [snapshot, setSnapshot] = useState<CounterSnapshot>(() => computeSnapshot(cfg));
  const animRef = useRef<number>(0);
  const lastCalcRef = useRef<number>(Date.now());

  // Recompute from engine every 30s to stay accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(computeSnapshot(cfg));
      lastCalcRef.current = Date.now();
    }, 30_000);
    return () => clearInterval(interval);
  }, [cfg]);

  // Smooth interpolation every frame
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const elapsed = (Date.now() - lastCalcRef.current) / 1000;
      const rate = snapshot.perSecondRate;
      setSnapshot(prev => ({
        ...prev,
        savedSubmissions: prev.savedSubmissions + rate * (1 / 60),
        hoursSaved: (prev.savedSubmissions + rate * (1 / 60)) * cfg.hoursSavedPerSubmission,
        adSavingsCad: (prev.savedSubmissions + rate * (1 / 60)) * cfg.adSavingsPerSubmissionCad,
      }));
      animRef.current = requestAnimationFrame(tick);
    };
    // Update at ~20fps for smooth rolling numbers without excess CPU
    const interval = setInterval(() => {
      setSnapshot(prev => {
        const rate = prev.perSecondRate;
        const delta = rate * 0.05; // 50ms worth
        const newSubs = prev.savedSubmissions + delta;
        return {
          ...prev,
          savedSubmissions: newSubs,
          hoursSaved: newSubs * cfg.hoursSavedPerSubmission,
          adSavingsCad: newSubs * cfg.adSavingsPerSubmissionCad,
        };
      });
    }, 50);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      clearInterval(interval);
    };
  }, [snapshot.perSecondRate, cfg]);

  return snapshot;
}
