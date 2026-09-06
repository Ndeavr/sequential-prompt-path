import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn() },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import { clearRoleIntent, readRoleIntent, saveRoleIntent, toCanonicalRole } from "./roleIntent";

describe("roleIntent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearRoleIntent();
  });

  it("preserves the full contractor activation context across a refresh", () => {
    const returnPath = "/join/profile?t=invite-1&ref=partner&utm_campaign=sept&step=profile";
    saveRoleIntent("contractor", {
      returnPath,
      token: "invite-1",
      prospectId: "prospect-1",
      leadId: "lead-1",
      affiliateRef: "partner",
      campaignId: "sept",
      onboardingStep: "profile",
      businessName: "Toitures Boréal",
      city: "Laval",
      trade: "Toiture",
      attribution: { ref: "partner", utm_campaign: "sept" },
    });
    sessionStorage.clear();

    expect(readRoleIntent()).toMatchObject({
      role: "contractor",
      returnPath,
      token: "invite-1",
      prospectId: "prospect-1",
      affiliateRef: "partner",
      onboardingStep: "profile",
      businessName: "Toitures Boréal",
    });
  });

  it("keeps organic homeowner and contractor intents distinct", () => {
    expect(toCanonicalRole("homeowner")).toBe("homeowner");
    expect(toCanonicalRole("contractor")).toBe("contractor");
    expect(toCanonicalRole("entrepreneur")).toBe("contractor");
  });

  it("rejects unknown or privileged-looking role strings", () => {
    expect(toCanonicalRole("superadmin")).toBeNull();
    expect(toCanonicalRole("service_role")).toBeNull();
  });
});