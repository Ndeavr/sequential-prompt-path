/**
 * UNPRO — Feature Flags (simple in-memory store, easily swappable to Supabase)
 */

const DEFAULT_FLAGS: Record<string, boolean> = {
  screenshot_detection_mobile: true,
  smart_share_prompt: true,
  friction_scoring: true,
  admin_alerts: true,
  recommendations_engine: true,
  web_share_fallback: true,
};

let overrides: Record<string, boolean> = {};

export function isFeatureEnabled(flag: string): boolean {
  if (flag in overrides) return overrides[flag];
  return DEFAULT_FLAGS[flag] ?? false;
}

export function setFeatureFlag(flag: string, value: boolean) {
  overrides[flag] = value;
}

export function resetFeatureFlags() {
  overrides = {};
}

export function getAllFlags(): Record<string, boolean> {
  return { ...DEFAULT_FLAGS, ...overrides };
}
