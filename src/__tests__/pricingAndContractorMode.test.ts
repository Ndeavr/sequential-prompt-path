/**
 * Regression test — guards the central pricing source of truth.
 * Ensures legacy plan names never leak back into the canonical catalog.
 */
import { describe, expect, it } from "vitest";
import {
  CONTRACTOR_PLANS,
  CANONICAL_PLAN_SLUGS,
  CANONICAL_PLAN_LABELS,
  FORBIDDEN_LEGACY_PLAN_NAMES,
  isLegacyPlanName,
  isCanonicalPlanSlug,
} from "@/config/pricing";
import {
  CONTRACTOR_INPUT_FIELDS,
  CONTRACTOR_OBJECTIVES,
  detectInputKind,
  shouldResumeOnboarding,
} from "@/config/contractorOnboarding";
import { resolveAlexMode } from "@/config/alexModes";

describe("pricing — single source of truth", () => {
  it("only exposes canonical slugs (recrue/pro/premium/elite/signature)", () => {
    expect(CANONICAL_PLAN_SLUGS).toEqual(["recrue", "pro", "premium", "elite", "signature"]);
  });

  it("never includes legacy plan names in catalog", () => {
    for (const plan of CONTRACTOR_PLANS) {
      expect(isLegacyPlanName(plan.name)).toBe(false);
      expect(isLegacyPlanName(plan.slug)).toBe(false);
    }
    for (const label of Object.values(CANONICAL_PLAN_LABELS)) {
      expect(isLegacyPlanName(label)).toBe(false);
    }
  });

  it("flags every forbidden legacy name", () => {
    for (const banned of FORBIDDEN_LEGACY_PLAN_NAMES) {
      expect(isLegacyPlanName(banned)).toBe(true);
      expect(isCanonicalPlanSlug(banned)).toBe(false);
    }
  });
});

describe("contractor onboarding — input + resume", () => {
  it("accepts website, RBQ, NEQ, phone, business name", () => {
    expect(CONTRACTOR_INPUT_FIELDS.map((f) => f.kind)).toEqual([
      "website", "rbq", "neq", "phone", "business_name",
    ]);
  });

  it("routes input kind heuristically", () => {
    expect(detectInputKind("https://unprotoiture.com")).toBe("website");
    expect(detectInputKind("unprotoiture.com")).toBe("website");
    expect(detectInputKind("5732-1234-01")).toBe("rbq");
    expect(detectInputKind("1234567890")).toBe("neq");
    expect(detectInputKind("514 555 1234")).toBe("phone");
    expect(detectInputKind("Toiture Tremblay inc.")).toBe("business_name");
  });

  it("resumes (never restarts) when contractor profile exists", () => {
    expect(shouldResumeOnboarding({ hasContractorProfile: true,  hasAippScore: false })).toBe(true);
    expect(shouldResumeOnboarding({ hasContractorProfile: true,  hasAippScore: true  })).toBe(true);
    expect(shouldResumeOnboarding({ hasContractorProfile: false, hasAippScore: false })).toBe(false);
  });

  it("maps every objective chip to a canonical plan slug", () => {
    for (const obj of CONTRACTOR_OBJECTIVES) {
      expect(CANONICAL_PLAN_SLUGS).toContain(obj.recommendedPlan);
    }
  });
});

describe("alex modes — contractor mode is forced", () => {
  it("contractor role forces contractor mode (no homeowner fallback)", () => {
    const m = resolveAlexMode({ role: "contractor", hasContractorProfile: false });
    expect(m.mode).toBe("contractor");
    expect(m.allowHomeownerFallback).toBe(false);
    expect(m.allowOnboardingRestart).toBe(false);
    expect(m.panelKey).toBe("PanelContractorAdvisorAlex");
  });

  it("contractor profile forces contractor mode even without role", () => {
    const m = resolveAlexMode({ role: null, hasContractorProfile: true });
    expect(m.mode).toBe("contractor");
  });

  it("admin preview always renders contractor advisor", () => {
    const m = resolveAlexMode({ role: "admin", hasContractorProfile: false, isAdminPreview: true });
    expect(m.panelKey).toBe("PanelContractorAdvisorAlex");
  });

  it("default falls back to homeowner", () => {
    const m = resolveAlexMode({ role: null, hasContractorProfile: false });
    expect(m.mode).toBe("homeowner");
  });
});
