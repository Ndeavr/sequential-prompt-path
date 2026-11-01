import { describe, it, expect } from "vitest";
import { simulateSales, validateSalesStep, EMPTY_SALES_FORM, buildShareUrl, pickUtm, parseAmount, buildSalesClaraLink } from "@/lib/salesTeamIntake";

describe("sales team intake rules", () => {
  it("simulation: ventes = objectif / panier, RDV = ventes / taux", () => {
    expect(simulateSales(100000, 10000, 25)).toEqual({ additionalSales: 10, appointments: 40, annual: true });
  });
  it("aucune division par zéro : panier ou taux à 0 ou inconnu", () => {
    expect(simulateSales(100000, 0, 25)).toBeNull();
    expect(simulateSales(100000, null, 25)).toBeNull();
    expect(simulateSales(100000, 10000, 0)?.appointments).toBeNull();
  });
  it("nombre de vendeurs entier >= 1 (solo recevable)", () => {
    const f = { ...EMPTY_SALES_FORM, company: "Synth", role: "owner" as const };
    expect(validateSalesStep(0, { ...f, sellers_count: "0" }).sellers_count).toBeTruthy();
    expect(validateSalesStep(0, { ...f, sellers_count: "2.5" }).sellers_count).toBeTruthy();
    expect(validateSalesStep(0, { ...f, sellers_count: "1" })).toEqual({});
  });
  it("consentement au suivi requis", () => {
    const f = { ...EMPTY_SALES_FORM, first_name: "A", last_name: "B", email: "a@example.test" };
    expect(validateSalesStep(4, f).follow_up_consent).toBeTruthy();
  });
  it("lien partagé sans données personnelles", () => {
    const url = buildShareUrl("https://unpro.ca", pickUtm("?utm_campaign=fb_dv&email=x@y.z&ref=aff"));
    expect(url).toBe("https://unpro.ca/directeur-des-ventes?utm_campaign=fb_dv&utm_source=share");
  });
  it("montants fr-CA avec espace insécable", () => {
    expect(parseAmount("12\u202f500,5")).toBe(12500.5);
  });
  it("contexte Clara sans coordonnées", () => {
    const l = decodeURIComponent(buildSalesClaraLink({ ...EMPTY_SALES_FORM, sellers_count: "3", email: "a@example.test", specialties: "toiture" }));
    expect(l).toContain("3 vendeurs");
    expect(l).not.toContain("a@example.test");
  });
});
