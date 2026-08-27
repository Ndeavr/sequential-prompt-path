/**
 * useOtpAutoSubmit — auto-validation OTP partagée.
 *
 * Règles UX :
 * - dès que `code` contient exactement 6 chiffres, la validation part après
 *   ~650 ms (délai réduit si prefers-reduced-motion) ;
 * - toute modification du code annule et relance le timer ;
 * - une seule soumission à la fois (verrou par code déjà tenté) ;
 * - le bouton manuel reste utilisable : `submitNow()` annule le timer et
 *   valide immédiatement.
 *
 * Ne touche ni à l'auth ni au formatage du téléphone.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const OTP_AUTO_DELAY_MS = 650;
export const OTP_AUTO_DELAY_REDUCED_MS = 200;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

interface Options {
  /** Code courant (chiffres uniquement). */
  code: string;
  /** Validation réelle. Doit résoudre/rejeter ; les erreurs sont gérées par l'appelant. */
  onSubmit: () => void | Promise<void>;
  /** Désactive l'auto-validation (ex. requête en cours ailleurs). */
  enabled?: boolean;
  /** Longueur attendue. */
  length?: number;
}

export function useOtpAutoSubmit({ code, onSubmit, enabled = true, length = 6 }: Options) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const attemptedRef = useRef<string | null>(null);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  const reduced = prefersReducedMotion();
  const delay = reduced ? OTP_AUTO_DELAY_REDUCED_MS : OTP_AUTO_DELAY_MS;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPending(false);
  }, []);

  const run = useCallback(async (value: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    attemptedRef.current = value;
    try {
      await submitRef.current();
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  }, []);

  /** Fallback manuel : valide tout de suite. */
  const submitNow = useCallback(() => {
    clear();
    void run(code);
  }, [clear, code, run]);

  useEffect(() => {
    clear();
    if (!enabled) return;
    if (code.length !== length) {
      // Le code a changé : on autorise une nouvelle tentative auto.
      attemptedRef.current = null;
      return;
    }
    if (attemptedRef.current === code) return; // déjà tenté, pas de boucle
    if (inFlightRef.current) return;

    setPending(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void run(code);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, enabled, length, delay]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return {
    /** true pendant le court délai avant l'envoi automatique. */
    pending,
    /** Durée du délai (ms) pour caler l'animation. */
    delay,
    reducedMotion: reduced,
    submitNow,
    /** Annule le timer (ex. sur erreur ou reset du champ). */
    cancel: clear,
  };
}
