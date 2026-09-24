import { describe, expect, it } from "vitest";
import {
  recommendPlanFromScore,
  recommendationReason,
} from "@/components/entrepreneur/AuditPersonalizedOfferCard";
import { PUBLIC_CONTRACTOR_PLANS } from "@/config/pricing";
import { buildAppointmentGuarantee } from "@/lib/pricing/appointmentGuarantee";

describe("offre personnalisée après le score IA", () => {
  it("recommande un forfait réel du catalogue pour chaque score", () => {
    for (const score of [0, 12, 34, 35, 50, 69, 70, 99, 100]) {
      const slug = recommendPlanFromScore(score);
      const plan = PUBLIC_CONTRACTOR_PLANS.find((p) => p.slug === slug);
      expect(plan, `plan introuvable pour ${score}`).toBeTruthy();
      expect(plan!.free).not.toBe(true);
      expect(plan!.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it("cite le score réel dans la recommandation, sans chiffre inventé", () => {
    const reason = recommendationReason(21, "Laval");
    expect(reason).toContain("21 / 100");
    expect(reason).toContain("Laval");
  });

  it("exprime la garantie sur 12 mois pour chaque forfait payant", () => {
    for (const plan of PUBLIC_CONTRACTOR_PLANS.filter((p) => !p.free)) {
      const g = buildAppointmentGuarantee(plan.appointmentsIncluded);
      expect(g.status).toBe("known");
      expect(g.annualGuarantee).toBe(plan.appointmentsIncluded * 12);
      expect(g.guaranteeLabel).toContain("12 mois");
    }
  });
});
