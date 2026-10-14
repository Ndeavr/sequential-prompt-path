vi.mock("@/services/clara/claraQualificationPersistence", () => ({ persistClaraQualification: vi.fn(() => Promise.resolve()), loadClaraQualification: vi.fn(() => Promise.resolve(null)) }));
/**
 * Qualification entrepreneur menée par Clara AVANT l'ouverture de l'audit.
 * Une question à la fois, jamais une question déjà répondue, ville de
 * l'entreprise distincte des territoires desservis.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/services/clara/claraSession", () => ({
  rememberClaraReferences: vi.fn(),
  saveClaraContext: vi.fn(() => Promise.resolve()),
}));

import {
  applyAnswer,
  isAddressAnswer,
  getClaraQualification,
  isQualificationComplete,
  MAX_QUALIFICATION_QUESTIONS,
  nextQualificationStep,
  saveClaraQualification,
} from "@/services/clara/claraContractorQualification";

describe("Clara — qualification entrepreneur", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("pose au maximum 5 questions, une seule à la fois", () => {
    expect(MAX_QUALIFICATION_QUESTIONS).toBeLessThanOrEqual(5);
    const first = nextQualificationStep();
    expect(first?.field).toBe("primary_trade");
  });

  it("ne repose jamais une question déjà répondue", () => {
    saveClaraQualification({ primary_trade: "Isolation" });
    expect(nextQualificationStep()?.field).toBe("customer_type");
    saveClaraQualification({ customer_type: "Résidentiel" });
    expect(nextQualificationStep()?.field).toBe("service_areas");
    saveClaraQualification({ service_areas: ["Laval"] });
    expect(nextQualificationStep()?.field).toBe("goals");
    saveClaraQualification({ goals: ["Plus de contrats"] });
    expect(nextQualificationStep()?.field).toBe("business_name");
  });

  it("garde la clientèle desservie sans changer le rôle entrepreneur", () => {
    saveClaraQualification({ primary_trade: "Design intérieur", customer_type: "Résidentiel" });
    expect(getClaraQualification().customer_type).toBe("Résidentiel");
    expect(getClaraQualification().provenance?.customer_type).toBe("declared");
  });

  it("garde la ville de l'entreprise séparée des territoires desservis", () => {
    saveClaraQualification({ business_city: "Terrebonne" });
    saveClaraQualification({ service_areas: ["Laval", "Montréal"] });
    const known = getClaraQualification();
    expect(known.business_city).toBe("Terrebonne");
    expect(known.service_areas).toEqual(["Laval", "Montréal"]);
    expect(known.service_areas).not.toContain("Terrebonne");
  });

  it("marque toute réponse de conversation comme déclarée", () => {
    saveClaraQualification({ primary_trade: "Toiture" });
    expect(getClaraQualification().provenance?.primary_trade).toBe("declared");
  });

  it("découpe une réponse multiple en plusieurs territoires", () => {
    saveClaraQualification({ primary_trade: "Isolation", customer_type: "Résidentiel", business_city: "Terrebonne" });
    const step = nextQualificationStep();
    expect(step?.field).toBe("service_areas");
    if (!step) throw new Error("Missing step");
    applyAnswer(step, "Laval, Montréal et Repentigny");
    expect(getClaraQualification().service_areas).toEqual(["Laval", "Montréal", "Repentigny"]);
  });

  it("ne transforme jamais une adresse de propriété à confirmer en territoires", () => {
    saveClaraQualification({ primary_trade: "Isolation", customer_type: "Résidentiel" });
    const step = nextQualificationStep();
    if (!step) throw new Error("Missing step");
    for (const answer of ["L'adresse de ma propriété est 128 78e Avenue, LaSalle (à confirmer).", "128 78e ave", "123 rue Centrale"]) {
      expect(isAddressAnswer(answer)).toBe(true);
      applyAnswer(step, answer);
      expect(getClaraQualification().service_areas).toBeUndefined();
      expect(nextQualificationStep()?.field).toBe("service_areas");
    }
    expect(isAddressAnswer("Laval, Montréal et Repentigny")).toBe(false);
  });

  it("termine la qualification une fois toutes les réponses obtenues", () => {
    saveClaraQualification({
      primary_trade: "Isolation",
      customer_type: "Résidentiel",
      business_city: "Terrebonne",
      service_areas: ["Laval"],
      goals: ["Plus de contrats"],
      business_name: "Toitures Test",
    });
    expect(isQualificationComplete()).toBe(true);
  });

  it("le chat qualifie avant d'ouvrir l'audit", () => {
    const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
    expect(box).toContain("askNextQualification");
    // La transition vers l'audit n'a lieu que si aucune question ne reste.
    expect(box).toContain("if (!asked) {");
    expect(box).toContain("CLARA_CONTRACTOR_ANALYSIS_NOTE");
  });

  it("le bouton « Compléter mon profil » ne peut pas être bloqué par la journalisation", () => {
    const page = readFileSync("src/pages/entrepreneur/PageAiRecommendationAudit.tsx", "utf8");
    expect(page).toContain("profile_completion_clicked");
    expect(page).toContain("setActivating(true)");
    expect(page).toContain("non bloquant");
    expect(page).toContain("activationError");
  });
});
