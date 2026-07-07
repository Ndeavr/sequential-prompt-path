/**
 * UNPRO — Contractor Profile Generator V2
 * Single entry point for contractor page generation, validation, scoring.
 */
export * from "./generator/pageTypes";
export { default as LogoResolver } from "./logo/LogoResolver";
export { default as MonogramBadge, computeMonogramInitials } from "./logo/MonogramBadge";
export { default as IntelligentPlaceholder } from "./media/IntelligentPlaceholder";
export { resolveGallerySlots, countVerifiedAssets } from "./media/mediaContract";
export { selectHeroImage, isStockTrope } from "./media/heroSelector";
export { detectLanguage, auditPageLanguage } from "./lang/detectPageLanguage";
export { computeProfileScore, type ProfileScore } from "./scoring/profileScore";
export { validatePublicPage, type ValidationResult, type ValidationCheck } from "./validation/validatePublicPage";
export { default as RegistryTemplate } from "./templates/RegistryTemplate";
