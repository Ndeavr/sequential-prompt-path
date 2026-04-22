/**
 * useHesitationRescue — Detects 8s idle and shows contextual help nudge.
 * Max 2 nudges per screen session, then goes passive.
 */
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { createFrictionSignal } from "@/services/alexFrictionEngine";

interface HesitationConfig {
  screenKey: string;
  idleMs?: number;
  maxNudges?: number;
  messages?: { title: string; description: string; action?: string }[];
}

const DEFAULT_MESSAGES: Record<string, { title: string; description: string }> = {
  account: { title: "Besoin d'aide?", description: "Alex peut compléter votre inscription en quelques secondes." },
  import: { title: "L'analyse prend du temps?", description: "Ne vous inquiétez pas, nous importons toutes vos données." },
  score: { title: "Des questions sur votre score?", description: "Chaque section peut être améliorée facilement." },
  checklist: { title: "Alex peut compléter ça pour vous", description: "Passez en mode Alex pour remplir automatiquement." },
  calendar: { title: "Pas de calendrier Google?", description: "Vous pouvez passer cette étape et la configurer plus tard." },
  plan: { title: "Des questions sur les plans?", description: "Le Premium est le plus populaire auprès des entrepreneurs." },
  payment: { title: "Paiement 100% sécurisé", description: "Annulez en tout temps. Aucun engagement à long terme." },
};

export function useHesitationRescue({ screenKey, idleMs = 8000, maxNudges = 2 }: HesitationConfig) {
  const nudgeCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const activeRef = useRef(true);

  const showNudge = useCallback(() => {
    if (nudgeCountRef.current >= maxNudges || !activeRef.current) return;

    const msg = DEFAULT_MESSAGES[screenKey] || DEFAULT_MESSAGES.checklist;
    nudgeCountRef.current += 1;

    toast(msg.title, {
      description: msg.description,
      duration: 6000,
      action: {
        label: "OK",
        onClick: () => {},
      },
    });

    // Emit friction signal
    createFrictionSignal(nudgeCountRef.current === 1 ? "inactivity_30s" : "repeated_hesitation");
  }, [screenKey, maxNudges]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (nudgeCountRef.current < maxNudges && activeRef.current) {
      timerRef.current = setTimeout(showNudge, idleMs);
    }
  }, [idleMs, maxNudges, showNudge]);

  useEffect(() => {
    const events = ["click", "scroll", "keydown", "touchstart", "mousemove"];
    const handler = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // Start initial timer

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      activeRef.current = false;
    };
  }, [resetTimer]);

  return { nudgeCount: nudgeCountRef.current };
}
