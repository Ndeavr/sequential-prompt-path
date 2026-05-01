/**
 * UNPRO — Centralized Motion Presets
 * Single source of truth for all framer-motion animations.
 *
 * Vault Motion System (Premium Vault feel):
 *   tokens   — durations, easings, intensity multipliers
 *   presets  — vaultLock, vaultOpen, scanSweep, criteriaTick, pressMechanical,
 *              successGlow, errorShake (in addition to existing presets)
 */

import type { Variants, Transition } from "framer-motion";

/* ─── Easing curves ─── */
const EASE_PREMIUM: Transition["ease"] = [0.22, 1, 0.36, 1];
const EASE_SPRING: Transition["ease"] = [0.16, 1, 0.3, 1];
const EASE_MECHANICAL: Transition["ease"] = [0.7, 0, 0.2, 1];
const EASE_ALEX_PULSE: Transition["ease"] = [0.45, 0, 0.55, 1];

export const easings = {
  premium: EASE_PREMIUM,
  spring: EASE_SPRING,
  mechanicalSnap: EASE_MECHANICAL,
  softVaultOpen: EASE_SPRING,
  alexPulse: EASE_ALEX_PULSE,
  cardReveal: EASE_PREMIUM,
} as const;

/* ─── Duration tokens (ms) ─── */
export const durations = {
  instant: 120,
  fast: 180,
  normal: 320,
  reveal: 650,
  cinematic: 1200,
} as const;

/* ─── Intensity multipliers ─── */
export type MotionIntensity = "subtle" | "standard" | "cinematic";
export const intensityMultiplier: Record<MotionIntensity, number> = {
  subtle: 0.6,
  standard: 1,
  cinematic: 1.4,
};

/* ─── Reusable transitions ─── */
export const transitions = {
  fast: { duration: durations.fast / 1000, ease: EASE_PREMIUM } as Transition,
  default: { duration: durations.normal / 1000, ease: EASE_PREMIUM } as Transition,
  smooth: { duration: 0.5, ease: EASE_SPRING } as Transition,
  slow: { duration: durations.reveal / 1000, ease: EASE_SPRING } as Transition,
  cinematic: { duration: durations.cinematic / 1000, ease: EASE_PREMIUM } as Transition,
  mechanical: { duration: durations.fast / 1000, ease: EASE_MECHANICAL } as Transition,
  /** Stagger children by 80ms */
  stagger: (stagger = 0.08) =>
    ({ staggerChildren: stagger, delayChildren: 0.05 }) as Transition,
} as const;

/* ─── Variant presets (existing) ─── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.default },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.fast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.default },
};

export const revealCard: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.97, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: transitions.slow,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transitions.default },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: transitions.stagger() },
};

export const staggerContainerCustom = (stagger = 0.08): Variants => ({
  hidden: {},
  visible: { transition: transitions.stagger(stagger) },
});

/* ─── Vault Motion presets ─── */

/** Mechanical lock — bolt clicks shut */
export const vaultLock: Variants = {
  idle: { scale: 1, rotate: 0 },
  locking: {
    scale: [1, 0.94, 1],
    rotate: [0, -6, 0],
    transition: { duration: durations.fast / 1000, ease: EASE_MECHANICAL },
  },
};

/** Vault opens — crisp release with soft overshoot */
export const vaultOpen: Variants = {
  closed: { scale: 0.96, opacity: 0, filter: "blur(8px)" },
  opening: {
    scale: [0.96, 1.04, 1],
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: durations.reveal / 1000, ease: EASE_SPRING },
  },
};

/** Horizontal scan sweep */
export const scanSweep: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: "100%",
    opacity: [0, 1, 1, 0],
    transition: { duration: 1.1, ease: "linear", repeat: Infinity, repeatDelay: 0.4 },
  },
};

/** Criteria tick — snap into alignment */
export const criteriaTick: Variants = {
  pending: { scale: 0.85, opacity: 0.4 },
  active: {
    scale: [0.85, 1.08, 1],
    opacity: 1,
    transition: { duration: 0.22, ease: EASE_MECHANICAL },
  },
};

/** Mechanical press — tactile button feedback (use as inline whileTap) */
export const pressMechanical = {
  whileTap: {
    scale: 0.97,
    transition: { duration: durations.instant / 1000, ease: EASE_MECHANICAL },
  },
} as const;

/** Success glow halo */
export const successGlow: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: [0.9, 1.15, 1],
    opacity: [0, 1, 0.85],
    transition: { duration: 0.7, ease: EASE_SPRING },
  },
};

/** Controlled error shake (no nausea) */
export const errorShake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -3, 3, 0],
    transition: { duration: 0.32, ease: EASE_MECHANICAL },
  },
};

/* ─── Interaction helpers (inline props, not variants) ─── */
export const press = { whileTap: { scale: 0.97 } } as const;
export const hover = { whileHover: { scale: 1.02 } } as const;
export const hoverLift = {
  whileHover: { y: -2, transition: transitions.fast },
} as const;

/* ─── Viewport trigger defaults ─── */
export const viewportOnce = { once: true, margin: "-60px" } as const;
