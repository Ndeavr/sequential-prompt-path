import { describe, it, expect } from "vitest";
import { isQualificationReady, prefillQualification, qualitativePayload, toClaraPatch, toQuoteContext, declaredCapacity } from "@/lib/contractorIntakeQualification";
import { objectiveToPayload } from "@/pages/contractor-funnel/PageContractorPricingIntake";

const full = {
  qualification: { priorities: ["Obtenir de meilleurs mandats"], preferred_work: "installations centrales", no_excluded_work: true, service_areas: "Laval, Rive-Nord", excluded_areas: "Montréal" },
  capacity_range: "1-9",
};

describe("qualification avant plan", () => {
  it("objectif qualitatif sans montant : prêt, sans revenu inventé", () => {
    expect(isQualificationReady(full)).toBe(true);
    const p = qualitativePayload({ trade_primary: "Thermopompes", city: "Laval" }, declaredCapacity(full)!);
    expect(p.average_project_value).toBe(0);
    expect(p.close_rate_estimate).toBe(0);
    expect(p.target_monthly_appointments).toBe(1);
    expect(p.monthly_capacity).toBe(9);
    expect(objectiveToPayload({ trade_primary: "Thermopompes", city: "Laval" } as never)).toBeNull();
  });
  it("préférences incomplètes : bloqué", () => {
    expect(isQualificationReady({ ...full, qualification: { ...full.qualification, no_excluded_work: false } })).toBe(false);
    expect(isQualificationReady({ ...full, qualification: { ...full.qualification, service_areas: "" } })).toBe(false);
    expect(isQualificationReady({ qualification: full.qualification })).toBe(false);
  });
  it("valeurs Clara préremplies sans écraser une saisie", () => {
    const known = { goals: ["Réduire mes déplacements", "Plus de commercial"], serviceAreas: ["Laval"], preferences: { work: ["centrales"], excludedWork: ["réparations"], excludedAreas: [] } };
    const a = prefillQualification({}, known);
    expect(a.priorities).toEqual(["Réduire mes déplacements"]);
    expect(a.other_goal).toBe("Plus de commercial");
    expect(a.excluded_work).toBe("réparations");
    expect(prefillQualification({ preferred_work: "mon texte" }, known).preferred_work).toBe("mon texte");
  });
  it("exclusions explicites conservées dans Clara et le devis", () => {
    const cap = declaredCapacity(full)!;
    expect(toClaraPatch(full.qualification, cap)).toMatchObject({ excluded_work: [], excluded_areas: ["Montréal"], service_areas: ["Laval", "Rive-Nord"], preferences_confirmed: true });
    expect(toQuoteContext(full.qualification, cap)).toMatchObject({ no_excluded_work: true, excluded_areas: ["Montréal"], provenance: "declared" });
  });
});
