import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canRunClaraAction, filterSuggestionsForRole } from "@/services/clara/claraRoleGuard";

describe("Clara — garde de rôle", () => {
  it("refuse toute action propriétaire en mode entrepreneur, affilié ou inconnu", () => {
    for (const role of ["contractor", "affiliate", "unknown"] as const) {
      expect(canRunClaraAction(role, "open_dossier_maison")).toBe(false);
      expect(canRunClaraAction(role, "resume_home_project")).toBe(false);
      expect(canRunClaraAction(role, "edit_property_address")).toBe(false);
    }
    expect(canRunClaraAction("homeowner", "open_dossier_maison")).toBe(true);
    expect(canRunClaraAction("homeowner", "contractor_activation_350")).toBe(false);
  });

  it("retire les suggestions maison hors du parcours propriétaire", () => {
    const options = ["Revenir à mon projet maison", "Choisir l'adresse", "Ouvrir mon dossier maison", "Peinture", "Laval"];
    expect(filterSuggestionsForRole("contractor", options)).toEqual(["Choisir l'adresse", "Peinture", "Laval"].filter((o) => o !== "Choisir l'adresse"));
    expect(filterSuggestionsForRole("homeowner", options)).toEqual(options);
  });

  it("n'affiche plus de texte d'auto-inspection au public", () => {
    const sheet = readFileSync("src/components/dossier-maison/DossierMaisonSheet.tsx", "utf8");
    const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
    expect(sheet).not.toMatch(/réellement enregistré|Rien n'est ajouté sans/);
    expect(box).not.toMatch(/Revenir à mon projet maison|Continuons votre projet maison/);
    expect(box).toMatch(/canRunClaraAction\(audience, "open_dossier_maison"\)/);
  });
});

import { contractorSuggestionsFor } from "@/services/clara/claraRoleGuard";
describe("Clara — boutons entrepreneur selon l'état", () => {
  it("donne 2-3 actions réelles, jamais maison, jamais réinscription après activation", () => {
    for (const s of ["visitor", "started", "registered", "activated"] as const) {
      const out = contractorSuggestionsFor(s);
      expect(out.length).toBeGreaterThanOrEqual(2);
      expect(out.length).toBeLessThanOrEqual(3);
      for (const o of out) expect(o.label).not.toMatch(/maison|propri/i);
    }
    expect(contractorSuggestionsFor("activated").some((o) => /inscri/i.test(o.label))).toBe(false);
    expect(contractorSuggestionsFor("visitor", "en")[0].label).toBe("View my AI score");
  });
});

import { resolveContractorJourneyState, contractorSuggestionsWithScore } from "@/services/clara/claraRoleGuard";
describe("Clara — état entrepreneur réel", () => {
  it("déduit l'état du compte et masque le score sans score réel", () => {
    expect(resolveContractorJourneyState({ hasProfile: false, flowStarted: false })).toBe("visitor");
    expect(resolveContractorJourneyState({ hasProfile: false, flowStarted: true })).toBe("started");
    expect(resolveContractorJourneyState({ hasProfile: true, publicStatus: "unpublished", flowStarted: true })).toBe("registered");
    expect(resolveContractorJourneyState({ hasProfile: true, publicStatus: "verified_active", flowStarted: false })).toBe("activated");
    expect(contractorSuggestionsWithScore("visitor", false).map((o) => o.label)).toEqual(["Vérifier ma visibilité IA", "M'inscrire comme entrepreneur"]);
    expect(contractorSuggestionsWithScore("visitor", true)[0].label).toBe("Voir mon score IA");
  });
});
