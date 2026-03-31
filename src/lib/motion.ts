/**
 * UNPRO — Centralized Motion Presets
 * Single source of truth for all framer-motion animations.
 */

import type { Variants, Transition } from "framer-motion";

/* ─── Shared easing ─── */
const EASE_PREMIUM: Transition["ease"] = [0.22, 1, 0.36, 1];
const EASE_SPRING: Transition["ease"] = [0.16, 1, 0.3, 1];

/* ─── Reusable transitions ─── */
export const transitions = {
  fast: { duration: 0.2, ease: EASE_PREMIUM } as Transition,
  default: { duration: 0.4, ease: EASE_PREMIUM } as Transition,
  smooth: { duration: 0.5, ease: EASE_SPRING } as Transition,
  slow: { duration: 0.6, ease: EASE_SPRING } as Transition,
  /** Stagger children by 80ms */
  stagger: (stagger = 0.08) =>
    ({ staggerChildren: stagger, delayChildren: 0.05 }) as Transition,
} as const;

/* ─── Variant presets ─── */

/** Fade up — sections, cards, paragraphs */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.default },
};

/** Fade in (no translate) — overlays, modals */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.fast },
};

/** Scale in — cards, badges, tooltips */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.default },
};

/** Reveal card — premium card entrance with blur */
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

/** Slide in from right — drawers, side panels */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transitions.default },
};

/** Staggered container — wrap children with fadeUp */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: transitions.stagger() },
};

/** Custom stagger container */
export const staggerContainerCustom = (stagger = 0.08): Variants => ({
  hidden: {},
  visible: { transition: transitions.stagger(stagger) },
});

/* ─── Interaction helpers (inline props, not variants) ─── */
export const press = { whileTap: { scale: 0.97 } } as const;
export const hover = { whileHover: { scale: 1.02 } } as const;
export const hoverLift = {
  whileHover: { y: -2, transition: transitions.fast },
} as const;

/* ─── Viewport trigger defaults ─── */
export const viewportOnce = { once: true, margin: "-60px" } as const;
