/**
 * Cookie consent store (Loi 25). Optional categories are OFF until the
 * visitor explicitly accepts them. Choice is stored locally and revocable
 * at any time via `openCookiePreferences()` (footer "Gérer mes témoins").
 * Any optional script must check `hasConsent("analytics")` before loading.
 */
export const COOKIE_CONSENT_KEY = "unpro-cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;
export const OPEN_PREFS_EVENT = "unpro:open-cookie-preferences";
export const CONSENT_CHANGED_EVENT = "unpro:cookie-consent-changed";

export type OptionalCategory = "analytics" | "marketing";

export interface CookieConsent {
  version: number;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed?.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: parsed.version,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      decidedAt: String(parsed.decidedAt ?? ""),
    };
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const value: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: choice applies to this page only */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
  } catch {
    /* noop */
  }
  return value;
}

/** Fail-closed: no stored decision = optional categories disabled. */
export function hasConsent(category: OptionalCategory): boolean {
  const c = readConsent();
  return c ? c[category] === true : false;
}

export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(OPEN_PREFS_EVENT));
}
