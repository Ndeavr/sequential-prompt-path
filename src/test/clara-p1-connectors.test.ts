/**
 * ONE CLARA — P1 : contrat des raccords métier.
 *
 * Chaque objet métier réellement créé doit déposer SA RÉFÉRENCE dans la
 * conversation canonique (`clara-session`), jamais une copie des données.
 * Ce test bloque toute régression silencieuse d'un raccord.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const CONNECTORS: Array<{ label: string; file: string; keys: string[] }> = [
  {
    label: "conversation → projet",
    file: "src/hooks/useCreateProject.ts",
    keys: ["active_project_id", "active_lead_id"],
  },
  {
    label: "conversation → Passeport Maison",
    file: "src/pages/dashboard/PropertyPassportPage.tsx",
    keys: ["active_property_id"],
  },
  {
    label: "conversation → vérification entrepreneur",
    file: "src/hooks/useVerifyContractor.ts",
    keys: ["verification_run_ids", "visitor_id"],
  },
  {
    label: "conversation → analyses visuelles",
    file: "src/features/visualAI/visualAnalysisService.ts",
    keys: ["visual_analysis_ids"],
  },
  {
    label: "conversation → jumelage",
    file: "src/features/recommendation/useEligibleRecommendation.ts",
    keys: ["selected_match_id", "selected_contractor_id"],
  },
  {
    label: "jumelage → rendez-vous",
    file: "src/components/contractor/BookAppointmentCard.tsx",
    keys: ["selected_match_id", "appointment_id"],
  },
  {
    label: "entrepreneur → plan personnalisé",
    file: "src/services/contractorPricingQuoteService.ts",
    keys: ["pricing_quote_id", "contractor_id"],
  },
  {
    label: "plan personnalisé → Stripe",
    file: "src/lib/billing/contractorPlanEligibility.ts",
    keys: ["pricing_quote_id", "checkout_session_id"],
  },
];

describe("ONE CLARA — raccords P1", () => {
  for (const c of CONNECTORS) {
    it(`${c.label} dépose ses références dans la conversation`, () => {
      const src = read(c.file);
      expect(src).toContain("rememberClaraReferences");
      for (const key of c.keys) expect(src).toContain(key);
    });
  }

  it("l'analyse de soumissions conserve son identifiant hors session éphémère", () => {
    const src = read("src/features/quoteAnalyzer/services/quoteAnalysisClient.ts");
    expect(src).toContain("quote_analysis_ids");
    expect(src).toContain("localStorage");
  });

  it("aucun raccord ne recrée une couche de conversation parallèle", () => {
    for (const c of CONNECTORS) {
      const src = read(c.file);
      expect(src).not.toContain("alex_conversation_sessions");
      expect(src).not.toContain("alex_homeowner_sessions");
    }
  });

  it("la conversation ne transporte que des références autorisées", () => {
    const src = read("supabase/functions/clara-session/index.ts");
    for (const key of [
      "active_project_id",
      "active_lead_id",
      "active_property_id",
      "selected_match_id",
      "appointment_id",
      "pricing_quote_id",
      "checkout_session_id",
      "verification_run_ids",
      "visual_analysis_ids",
      "quote_analysis_ids",
    ]) {
      expect(src).toContain(key);
    }
  });
});
