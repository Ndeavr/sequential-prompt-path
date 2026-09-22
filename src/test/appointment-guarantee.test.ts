import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  buildAppointmentGuarantee,
  buildPriceObjectionCopy,
} from "@/lib/pricing/appointmentGuarantee";

describe("promesse de rendez-vous — source unique", () => {
  it("dérive la garantie annuelle de la cadence réelle", () => {
    const g = buildAppointmentGuarantee(5);
    expect(g.status).toBe("known");
    expect(g.annualGuarantee).toBe(60);
    expect(g.cadenceLabel).toBe("Jusqu'à 5 rendez-vous par mois");
    expect(g.guaranteeLabel).toBe("60 rendez-vous qualifiés garantis sur 12 mois");
    expect(g.checkoutPrimaryLabel).toBe("60 rendez-vous garantis / 12 mois");
  });

  it("s'adapte à une cadence différente", () => {
    expect(buildAppointmentGuarantee(7).annualGuarantee).toBe(84);
    expect(buildAppointmentGuarantee(12).annualGuarantee).toBe(144);
  });

  it("n'invente aucun chiffre sans donnée fiable", () => {
    for (const value of [null, undefined, 0, -3, Number.NaN]) {
      const g = buildAppointmentGuarantee(value as number | null);
      expect(g.status).toBe("unknown");
      expect(g.annualGuarantee).toBeNull();
      expect(g.guaranteeLabel).not.toMatch(/\d/);
    }
  });

  it("répond à l'objection prix avec les chiffres du plan réel", () => {
    const copy = buildPriceObjectionCopy(buildAppointmentGuarantee(5));
    expect(copy).toContain("35 $");
    expect(copy).toContain("exclusif");
    expect(copy).toContain("60 rendez-vous garantis sur 12 mois");
  });

  it("ne cite aucun chiffre quand le plan est inconnu", () => {
    const copy = buildPriceObjectionCopy(buildAppointmentGuarantee(null));
    expect(copy).toContain("calculée sur l'année");
    expect(copy).not.toMatch(/\d+ rendez-vous garantis/);
  });
});

describe("aucune promesse mensuelle ambiguë dans les surfaces actives", () => {
  const SURFACES = [
    "src/pages/pricing/PricingFaq.tsx",
    "src/components/voice-sales/CardPlanRegular.tsx",
    "src/components/voice-sales/CardPlanFounders.tsx",
    "src/components/onboarding/StepPlanRecommendation.tsx",
    "src/pages/contractor-funnel/PageContractorCheckout.tsx",
    "src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx",
  ];

  it("n'affiche jamais « garantis par mois » ni « garantis chaque mois »", () => {
    for (const file of SURFACES) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/garantis?\s+(par|chaque)\s+mois/i);
    }
  });

  it("le moteur de recommandation de Clara ne code plus de cadence en dur", () => {
    const src = readFileSync("src/services/alexEntrepreneurGuidanceEngine.ts", "utf8");
    expect(src).not.toMatch(/\d+ rendez-vous inclus/);
    expect(src).toContain("CONTRACTOR_PLANS");
  });
});
