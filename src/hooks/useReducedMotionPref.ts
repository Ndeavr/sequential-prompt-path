/**
 * useReducedMotionPref — Combines OS prefers-reduced-motion with UNPRO user toggle.
 * Persisted in localStorage as `unpro_motion_pref` ('reduce' | 'full').
 */
import { useEffect, useState } from "react";

const KEY = "unpro_motion_pref";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "reduce") return true;
    if (v === "full") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function useReducedMotionPref(): [boolean, (v: boolean) => void] {
  const [reduced, setReduced] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(read());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setPref = (on: boolean) => {
    try {
      localStorage.setItem(KEY, on ? "reduce" : "full");
    } catch {
      /* ignore */
    }
    setReduced(on);
  };

  return [reduced, setPref];
}
