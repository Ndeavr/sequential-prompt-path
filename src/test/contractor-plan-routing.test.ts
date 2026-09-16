import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  contractorPlanLink,
  resolvePlanDestination,
  isContractorObjective,
  CONTRACTOR_PLAN_ENTRY_ROUTE,
  HOMEOWNER_PLANS_ROUTE,
  CONTRACTOR_OBJECTIVE_CTA,
} from "@/lib/routing/contractorPlanRoute";

describe("contractorPlanLink", () => {
  it("construit l'URL canonique avec objectif et origine", () => {
    expect(contractorPlanLink({ objective: "territory", from: "dashboard_upsell" })).toBe(
      "/entrepreneur/plan-personnalise?objective=territory&from=dashboard_upsell",
    );
  });

  it("reste sur la route d'entrée sans contexte", () => {
    expect(contractorPlanLink()).toBe(CONTRACTOR_PLAN_ENTRY_ROUTE);
  });

  it("ignore un objectif inconnu", () => {
    expect(isContractorObjective("cheap_leads")).toBe(false);
  });
});

describe("resolvePlanDestination", () => {
  it("n'expose aucune offre tant que le rôle n'est pas résolu", () => {
    expect(
      resolvePlanDestination({ role: null, isAuthenticated: true, isResolving: true }),
    ).toEqual({ kind: "loading" });
  });

  it("envoie un entrepreneur vers son plan personnalisé", () => {
    const d = resolvePlanDestination({
      role: "contractor",
      isAuthenticated: true,
      isResolving: false,
      objective: "more_appointments",
    });
    expect(d.kind).toBe("contractor");
    expect(d.kind !== "loading" && d.href.startsWith(CONTRACTOR_PLAN_ENTRY_ROUTE)).toBe(true);
  });

  it("garde un propriétaire sur les plans Maison", () => {
    expect(
      resolvePlanDestination({ role: "homeowner", isAuthenticated: true, isResolving: false }),
    ).toEqual({ kind: "homeowner", href: HOMEOWNER_PLANS_ROUTE });
  });

  it("conserve l'objectif pour un visiteur non connecté", () => {
    const d = resolvePlanDestination({
      role: null,
      isAuthenticated: false,
      isResolving: false,
      objective: "visibility",
    });
    expect(d.kind).toBe("contractor_public");
    expect(d.kind !== "loading" && d.href).toContain("objective=visibility");
  });
});

describe("surfaces entrepreneur", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("le tableau de bord n'envoie plus vers les plans Maison et n'affiche aucun prix codé", () => {
    const upsell = read("src/components/pro-dashboard/DashUpsell.tsx");
    expect(upsell).not.toContain('to="/pricing"');
    expect(upsell).not.toMatch(/\d+\s*\$\/mois/);
    expect(upsell).toContain("contractorPlanLink");
  });

  it("les surfaces entrepreneur passent par le module de routage", () => {
    for (const file of [
      "src/components/pro-dashboard/DashObjective.tsx",
      "src/components/pro-dashboard/AlexSalesPanel.tsx",
      "src/components/booking/SignatureLockedOverlay.tsx",
      "src/components/booking/SignatureDowngradeBanner.tsx",
      "src/components/alex/AlexAutopilotProvider.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("contractorPlanLink");
      expect(src, file).not.toContain('navigate("/pricing")');
      expect(src, file).not.toContain('to="/pricing"');
    }
  });

  it("les libellés de CTA sont cohérents", () => {
    expect(Object.values(CONTRACTOR_OBJECTIVE_CTA)).toEqual([
      "Obtenir plus de rendez-vous",
      "Améliorer ma visibilité IA",
      "Développer mon territoire",
      "Voir mon plan personnalisé",
    ]);
  });

  it("la route d'entrée entrepreneur existe sans doublon de page de prix", () => {
    const router = read("src/app/router.tsx");
    expect(router).toContain('path="/entrepreneur/plan-personnalise"');
    expect(router).toContain('path="/entrepreneur/plan-personnalise/:quoteId"');
    expect(router).toContain(
      '<Route path="/entrepreneur/pricing" element={<LegacyRedirect to="/entrepreneur/plan-personnalise" />} />',
    );
  });
});
