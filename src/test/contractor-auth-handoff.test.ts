import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { resolveReturnDestination } from "@/lib/authReturn";

describe("contractor auth handoff keeps the quote", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("returns to the exact quote after login instead of /join/profile", () => {
    expect(contractorLoginPath("/entrepreneur/plan-personnalise/q1?ref=abc")).toBe("/login");
    expect(resolveReturnDestination({ role: null })).toBe("/entrepreneur/plan-personnalise/q1?ref=abc");
  });
  it("rejects external return paths", () => {
    contractorLoginPath("//evil.com");
    expect(resolveReturnDestination({ role: null })).toBe("/entrepreneur/devis-personnalise");
  });
  it("funnel pages never route through /auth (which drops the query)", () => {
    for (const f of ["PageContractorPersonalizedPlan", "PageContractorCheckout"]) {
      const src = readFileSync(`src/pages/contractor-funnel/${f}.tsx`, "utf8");
      expect(src).not.toMatch(/navigate\(`\/auth\?/);
      expect(src).toContain("contractorLoginPath(");
    }
  });
});
