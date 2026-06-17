/**
 * alexFeatureFlags — Feature flags for Alex behavior control.
 * Allows instant revert of Alex behavior changes.
 */

const FLAGS = {
  /** Keep the new intent homepage visible but use old Alex brain */
  homepage_intent_reskin_only: true,
  /** Force use of existing Alex voice/text handlers */
  restore_existing_alex_brain: true,
  /** Disable any custom Alex logic added by the homepage */
  disable_homepage_custom_alex_logic: true,
  /** Enable debug panel for admin users */
  debug_alex_flow_admin: false,
  /** Alex V3 Universal Qualification Engine — gates matching behind score >= 70 */
  alex_v3_qualification_engine: true,
} as const;

type FlagKey = keyof typeof FLAGS;

export function getAlexFlag(key: FlagKey): boolean {
  try {
    const override = localStorage.getItem(`alex_flag_${key}`);
    if (override !== null) return override === "true";
  } catch {
    /* localStorage unavailable */
  }
  return FLAGS[key];
}

export function setAlexFlag(key: FlagKey, value: boolean): void {
  try {
    localStorage.setItem(`alex_flag_${key}`, String(value));
  } catch {
    /* localStorage unavailable */
  }
}

export function shouldUseExistingAlexHandlers(): boolean {
  return getAlexFlag("restore_existing_alex_brain") && getAlexFlag("disable_homepage_custom_alex_logic");
}

export function isQualificationEngineEnabled(): boolean {
  return getAlexFlag("alex_v3_qualification_engine");
}
