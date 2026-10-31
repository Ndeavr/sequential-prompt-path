import { describe, expect, it } from "vitest";
import { buildDemandLandingCopy } from "@/lib/demand/demandLandingCopy";

describe("demand-first contractor landing copy", () => {
  it("never invents a waiting homeowner when no demand is recorded", () => {
    for (const count of [0, null, undefined, Number.NaN, -1]) {
      const copy = buildDemandLandingCopy("Pointe-aux-Trembles", "ferblanterie", count);
      expect(copy.hasRecordedDemand).toBe(false);
      expect(copy.count).toBe(0);
      expect(copy.title).toContain("Développez votre clientèle");
      expect(copy.title).not.toContain("propriétaires cherchent");
    }
  });

  it("reflects only the recorded count with correct French agreement", () => {
    expect(buildDemandLandingCopy("Laval", "toiture", 1).title)
      .toBe("1 demande de propriétaires enregistrée pour toiture à Laval.");
    expect(buildDemandLandingCopy("Laval", "toiture", 3).title)
      .toBe("3 demandes de propriétaires enregistrées pour toiture à Laval.");
  });

  it("states the verified offer components without promising an appointment", () => {
    const copy = buildDemandLandingCopy("Montréal", "capage-colonnes", 0);
    expect(copy.description).toContain("350 $");
    expect(copy.description).toContain("12 mois");
    expect(copy.description.toLowerCase()).not.toMatch(/garanti|premier rendez-vous/);
    expect(copy.title).toContain("capage colonnes");
  });
});
