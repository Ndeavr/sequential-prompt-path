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
 *   - Otherwise, persona detection runs on the latest user utterance
 *     so contractor-intent visitors get the contractor framing instead
 *     of the homeowner default.
 */

import { detectPersona } from "@/features/alex/intent/alexPersonaRouter";

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
  /** Latest user utterance — used for intent-based persona detection when
   *  there is no explicit role (logged-out or generic homeowner). */
  lastUserText?: string | null;
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
  greetingFr:
    "Bonjour. J'ai analysé votre présence numérique. Puis-je vous montrer ce que les moteurs IA comprennent actuellement de votre entreprise ?",
  allowHomeownerFallback: false,
  allowOnboardingRestart: false,
};

const HOMEOWNER_DESCRIPTOR: AlexModeDescriptor = {
  mode: "homeowner",
  panelKey: "PanelAlexHomeownerFlow",
  greetingFr:
    "Bonjour. Quel problème ou projet souhaitez-vous régler aujourd'hui ?",
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
 *   2. Explicit contractor role OR contractor profile → CONTRACTOR.
 *   3. Condo manager profile → CONDO.
 *   4. Intent-based persona detection on `lastUserText` (only when there is
 *      no explicit non-homeowner role) — contractor signals win over
 *      homeowner default so an unauthenticated visitor saying "je veux plus
 *      de clients" gets the contractor framing.
 *   5. Default → HOMEOWNER.
 */
export function resolveAlexMode(ctx: AlexModeContext): AlexModeDescriptor {
  if (ctx.isAdminPreview) return ADMIN_PREVIEW_DESCRIPTOR;
  if (ctx.role === "contractor" || ctx.hasContractorProfile) {
    return CONTRACTOR_DESCRIPTOR;
  }
  if (ctx.hasCondoProfile) return CONDO_DESCRIPTOR;

  // Intent fallback — only when no contractor/condo signal exists.
  if (ctx.lastUserText) {
    const persona = detectPersona(ctx.lastUserText);
    if (persona === "CONTRACTOR") return CONTRACTOR_DESCRIPTOR;
    if (persona === "PROPERTY_MANAGER") return CONDO_DESCRIPTOR;
  }

  return HOMEOWNER_DESCRIPTOR;
}

/** Convenience: true if Alex must run in contractor mode for this context. */
export function isContractorMode(ctx: AlexModeContext): boolean {
  return resolveAlexMode(ctx).mode === "contractor" || resolveAlexMode(ctx).mode === "admin_preview";
}
