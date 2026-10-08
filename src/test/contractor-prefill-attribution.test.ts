import { describe, it, expect, beforeEach } from "vitest";
import { getKnownContractorContext } from "@/lib/contractorKnownContext";
import { saveClaraQualification } from "@/services/clara/claraContractorQualification";
import { planReturnUrl } from "@/lib/billing/reconcileQuotePayment";

describe("Clara → intake transfer", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("keeps all territories and qualitative goals verbatim, no numbers invented", () => {
    saveClaraQualification({
      business_name: "Toitures Test", primary_trade: "Toiture", business_city: "Laval",
      service_areas: ["Laval", "Terrebonne", "Blainville"], goals: ["plus de projets résidentiels"],
      website: "https://example.ca",
    } as never);
    const k = getKnownContractorContext();
    expect(k.businessName).toBe("Toitures Test");
    expect(k.city).toBe("Laval");
    expect(k.serviceAreas).toEqual(["Laval", "Terrebonne", "Blainville"]);
    expect(k.goals).toEqual(["plus de projets résidentiels"]);
    expect(k.website).toBe("https://example.ca");
  });
});

describe("Stripe return keeps prospect attribution", () => {
  it("cancel URL carries t/ref/utm and replaces checkout state", () => {
    const u = new URL(planReturnUrl("https://unpro.ca", "q1", "?t=tok&ref=AB&utm_campaign=ai_score_first_touch&checkout=success", "canceled"));
    expect(u.pathname).toBe("/entrepreneur/plan-personnalise/q1");
    expect(u.searchParams.get("t")).toBe("tok");
    expect(u.searchParams.get("ref")).toBe("AB");
    expect(u.searchParams.get("utm_campaign")).toBe("ai_score_first_touch");
    expect(u.searchParams.getAll("checkout")).toEqual(["canceled"]);
  });
});
