/**
 * UNPRO — ActivationConfetti
 * Effet confettis sobre, réservé à l'écran d'activation entrepreneur.
 * Se déclenche une seule fois par activation (aucun rejeu au rafraîchissement
 * de l'état ni au remontage de la page dans la même session).
 */
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const SESSION_FLAG = "unpro_activation_confetti_fired";

type Props = {
  /** Ne tire que lorsque l'activation est réellement confirmée. */
  active: boolean;
  /** Clé unique (ex. id entrepreneur) pour ne rejouer qu'une fois. */
  runKey?: string | null;
};

export default function ActivationConfetti({ active, runKey }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const flag = `${SESSION_FLAG}:${runKey ?? "default"}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      /* stockage indisponible : l'effet reste limité au ref ci-dessous */
    }

    fired.current = true;

    const colors = ["#F5C451", "#FFFFFF", "#7DA8FF", "#2E6BFF"];
    const base = {
      colors,
      disableForReducedMotion: true,
      scalar: 0.85,
      ticks: 140,
      gravity: 1.1,
      zIndex: 60,
    } as const;

    confetti({ ...base, particleCount: 48, spread: 55, startVelocity: 42, origin: { x: 0.2, y: 0.65 }, angle: 65 });
    confetti({ ...base, particleCount: 48, spread: 55, startVelocity: 42, origin: { x: 0.8, y: 0.65 }, angle: 115 });
    const t = window.setTimeout(() => {
      confetti({ ...base, particleCount: 34, spread: 80, startVelocity: 30, origin: { x: 0.5, y: 0.3 } });
    }, 220);

    return () => window.clearTimeout(t);
  }, [active, runKey]);

  return null;
}
