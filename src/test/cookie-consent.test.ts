import { describe, it, expect, beforeEach } from "vitest";
import { hasConsent, readConsent, saveConsent, COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";

describe("cookie consent (Loi 25)", () => {
  beforeEach(() => localStorage.clear());
  it("optional categories are off before any decision", () => {
    expect(readConsent()).toBeNull();
    expect(hasConsent("analytics")).toBe(false);
    expect(hasConsent("marketing")).toBe(false);
  });
  it("refuse all is stored and keeps optional off", () => {
    saveConsent({ analytics: false, marketing: false });
    expect(readConsent()).not.toBeNull();
    expect(hasConsent("analytics")).toBe(false);
  });
  it("choice is revocable", () => {
    saveConsent({ analytics: true, marketing: true });
    expect(hasConsent("analytics")).toBe(true);
    saveConsent({ analytics: false, marketing: true });
    expect(hasConsent("analytics")).toBe(false);
    expect(hasConsent("marketing")).toBe(true);
  });
  it("corrupt storage fails closed", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "{bad");
    expect(hasConsent("analytics")).toBe(false);
  });
});
