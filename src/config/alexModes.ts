/**
 * UNPRO — ALEX MODE CONFIG (single source of truth)
 *
 * Alex behaves very differently depending on who is in front of her.
 * This file defines the modes and the resolver every surface
 * (chat, voice modal, admin preview) MUST use.
 *
 * Rule:
 *   - If user_role = "contractor" OR a contractor profile exists,
 *     Alex is locked into CONTRACTOR_MODE. No homeowner fallback.
 *   - Admins viewing impersonation always see CONTRACTOR_MODE.
 *   - Otherwise, Alex defaults to HOMEOWNER_MODE.
 */

export type AlexMode = "contractor" | "homeowner" | "condo_manager" | "admin_preview";

export interface AlexModeContext {
  /** Auth role from `user_roles` (admin / contractor / homeowner / null). */
  role: string | null;
  /** True if a row exists in `contractors` for this user. */
  hasContractorProfile: boolean;
  /** True if a row exists in `condo_managers` for this user. */
  hasCondoProfile?: boolean;
  /** Admin previewing another contractor's view. */
  isAdminPreview?: boolean;
}

export interface AlexModeDescriptor {
  mode: AlexMode;
  /** Component key the surface should mount. */
  panelKey: "PanelContractorAdvisorAlex" | "PanelAlexHomeownerFlow" | "PanelAlexCondoFlow";
  /** Voice greeting (FR). */
  greetingFr: string;
  /** Allow homeowner-style fallback flows. ALWAYS false for contractor. */
  allowHomeownerFallback: boolean;
  /** Allow generic onboarding restart. ALWAYS false for contractor. */
  allowOnboardingRestart: boolean;
}

const CONTRACTOR_DESCRIPTOR: AlexModeDescriptor = {
  mode: "contractor",
  panelKey: "PanelContractorAdvisorAlex",
  greetingFr: "Bonjour. Donnez-moi votre site web ou RBQ et je lance l'analyse instantanée.",
  allowHomeownerFallback: false,
  allowOnboardingRestart: false,
};

const HOMEOWNER_DESCRIPTOR: AlexModeDescriptor = {
  mode: "homeowner",
  panelKey: "PanelAlexHomeownerFlow",
  greetingFr: "Bonjour. Décrivez votre situation ou envoyez une photo.",
  allowHomeownerFallback: true,
  allowOnboardingRestart: true,
};

const CONDO_DESCRIPTOR: AlexModeDescriptor = {
  mode: "condo_manager",
  panelKey: "PanelAlexCondoFlow",
  greetingFr: "Bonjour. Comment puis-je aider votre copropriété ?",
  allowHomeownerFallback: false,
  allowOnboardingRestart: false,
};

const ADMIN_PREVIEW_DESCRIPTOR: AlexModeDescriptor = {
  ...CONTRACTOR_DESCRIPTOR,
  mode: "admin_preview",
};

/**
 * Resolve the Alex mode for a given context.
 *
 * Order of precedence:
 *   1. Admin preview (always contractor view).
 *   2. Contractor role OR contractor profile → CONTRACTOR.
 *   3. Condo manager profile → CONDO.
 *   4. Default → HOMEOWNER.
 */
export function resolveAlexMode(ctx: AlexModeContext): AlexModeDescriptor {
  if (ctx.isAdminPreview) return ADMIN_PREVIEW_DESCRIPTOR;
  if (ctx.role === "contractor" || ctx.hasContractorProfile) {
    return CONTRACTOR_DESCRIPTOR;
  }
  if (ctx.hasCondoProfile) return CONDO_DESCRIPTOR;
  return HOMEOWNER_DESCRIPTOR;
}

/** Convenience: true if Alex must run in contractor mode for this context. */
export function isContractorMode(ctx: AlexModeContext): boolean {
  return resolveAlexMode(ctx).mode === "contractor" || resolveAlexMode(ctx).mode === "admin_preview";
}
