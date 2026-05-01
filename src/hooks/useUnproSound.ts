/**
 * useUnproSound — Premium vault sound layer for UNPRO interactions.
 *
 * - Default volume 0.18 (already enforced in audioEngineUNPRO)
 * - Honours prefers-reduced-motion (also mutes sounds when set)
 * - Auto-disables on mobile when AudioContext stays suspended
 * - Persisted "Sons interface" toggle via localStorage (key handled by audioEngine prefs)
 *
 * Typed methods:
 *   softClick, criteriaClick, vaultClack, matchSuccess, scanStart,
 *   alexListening, alexThinking, paymentSuccess, errorSoft
 */

import { useCallback, useEffect, useState } from "react";
import { audioEngine, type SoundEvent } from "@/services/audioEngineUNPRO";

const REDUCED_MOTION_KEY = "unpro_motion_pref";

function readReducedMotionPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(REDUCED_MOTION_KEY);
    if (v === "reduce") return true;
    if (v === "full") return false;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function useUnproSound() {
  const [enabled, setEnabled] = useState<boolean>(audioEngine.isEnabled());
  const [reduced, setReduced] = useState<boolean>(readReducedMotionPref());

  // Unlock on first user gesture (mobile autoplay)
  useEffect(() => {
    const handler = () => audioEngine.unlock();
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // React to system reduced-motion changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(readReducedMotionPref());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const play = useCallback(
    (event: SoundEvent) => {
      if (!enabled || reduced) return;
      audioEngine.play(event);
    },
    [enabled, reduced],
  );

  const setSoundEnabled = useCallback((on: boolean) => {
    if (on) audioEngine.unmute();
    else audioEngine.mute();
    audioEngine.savePrefs();
    setEnabled(on);
  }, []);

  const setReducedMotion = useCallback((on: boolean) => {
    try {
      localStorage.setItem(REDUCED_MOTION_KEY, on ? "reduce" : "full");
    } catch {
      // ignore
    }
    setReduced(on);
  }, []);

  return {
    enabled,
    reduced,
    setSoundEnabled,
    setReducedMotion,
    // Typed methods
    softClick: useCallback(() => play("soft-click"), [play]),
    criteriaClick: useCallback(() => play("criteria-click"), [play]),
    vaultClack: useCallback(() => play("vault-clack"), [play]),
    matchSuccess: useCallback(() => play("match-success"), [play]),
    scanStart: useCallback(() => play("scan-start"), [play]),
    alexListening: useCallback(() => play("alex-listening"), [play]),
    alexThinking: useCallback(() => play("alex-thinking"), [play]),
    paymentSuccess: useCallback(() => play("payment-success"), [play]),
    errorSoft: useCallback(() => play("error-soft"), [play]),
  };
}
