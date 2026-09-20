/**
 * Qualification entrepreneur menée par Clara AVANT l'ouverture de l'audit.
 * Une question à la fois, jamais une question déjà répondue, ville de
 * l'entreprise distincte des territoires desservis.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/services/clara/claraSession", () => ({
  rememberClaraReferences: vi.fn(),
}));

import {
  applyAnswer,
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
    expect(nextQualificationStep()?.field).toBe("business_city");
    saveClaraQualification({ business_city: "Terrebonne" });
    expect(nextQualificationStep()?.field).toBe("service_areas");
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
    saveClaraQualification({ primary_trade: "Isolation", business_city: "Terrebonne" });
    const step = nextQualificationStep();
    expect(step?.field).toBe("service_areas");
    applyAnswer(step!, "Laval, Montréal et Repentigny");
    expect(getClaraQualification().service_areas).toEqual(["Laval", "Montréal", "Repentigny"]);
  });

  it("termine la qualification une fois les 4 réponses obtenues", () => {
    saveClaraQualification({
      primary_trade: "Isolation",
      business_city: "Terrebonne",
      service_areas: ["Laval"],
      goals: ["Plus de contrats"],
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
