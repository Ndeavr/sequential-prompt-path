/**
 * UNPRO Motion components — barrel export.
 * Heavy components are exposed as lazy chunks for opt-in cinematic moments.
 */
import { lazy } from "react";

export { default as MotionButton } from "./MotionButton";
export type { MotionButtonProps, MotionButtonState } from "./MotionButton";
export { default as VaultButton } from "./VaultButton";
export type { VaultButtonProps } from "./VaultButton";
export { default as MatchButton } from "./MatchButton";
export type { MatchButtonProps } from "./MatchButton";
export { default as VerifiedBadgeLock } from "./VerifiedBadgeLock";
export type { VerifiedLockState } from "./VerifiedBadgeLock";
export { default as AIPPScoreDial } from "./AIPPScoreDial";
export { default as AnimatedProCard } from "./AnimatedProCard";
export { default as AnimatedPassportCard } from "./AnimatedPassportCard";
export { default as AlexOrbMotion } from "./AlexOrbMotion";
export type { AlexOrbMotionState } from "./AlexOrbMotion";
export { default as PageTransitionVault } from "./PageTransitionVault";

// Lazy-loaded cinematic components — opt-in (use with <Suspense>)
export const VaultReveal = lazy(() => import("./VaultReveal"));
export const CriteriaWheel = lazy(() => import("./CriteriaWheel"));
export const MatchingDoubleWheel = lazy(() => import("./MatchingDoubleWheel"));
export const MatchSuccessOverlay = lazy(() => import("./MatchSuccessOverlay"));
export const SecureCheckoutMotion = lazy(() => import("./SecureCheckoutMotion"));
