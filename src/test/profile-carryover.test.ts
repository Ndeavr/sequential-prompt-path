import { describe, expect, it } from "vitest";
import { canonicalProfileRows, contactFirstName } from "@/lib/contractor/profileCarryover";

describe("reprise du profil canonique : seulement ce qui a été déclaré", () => {
  it("langues, disponibilité et services enregistrés affichés en libellés lisibles", () => {
    const rows = canonicalProfileRows({ languages: ["fr", "en"], availability: "2_weeks", services_wanted: ["Isolation des combles", "Isolation par soufflage"] });
    expect(rows).toEqual([
      ["Langues de service (déclarées)", "Français, Anglais"],
      ["Prochaine disponibilité (déclarée)", "D'ici 2 semaines"],
      ["Services offerts (déclarés)", "Isolation des combles, Isolation par soufflage"],
    ]);
    expect(canonicalProfileRows({ languages: ["fr"] }, "en")).toEqual([["Languages (declared)", "French"]]);
  });
  it("métier isolation sans services déclarés : aucun service générique ajouté (ni CVAC ni asphalte)", () => {
    const rows = canonicalProfileRows({ primary_trade: "Isolation" });
    expect(rows).toEqual([]);
    expect(JSON.stringify(canonicalProfileRows({ services_wanted: ["Isolation des combles"] }))).not.toMatch(/CVAC|asphalt|thermopompe/i);
  });
  it("aucune réponse = rien à afficher; on demande seulement ce qui manque", () => {
    expect(canonicalProfileRows(null)).toEqual([]);
    expect(canonicalProfileRows({ languages: [], availability: "" })).toEqual([]);
  });
  it("prénom de la personne, jamais le nom de l'entreprise", () => {
    expect(contactFirstName({ first_name: "Sophie" }, "Isolation Solution Royal")).toBe("Sophie");
    expect(contactFirstName({ first_name: "Isolation Solution" }, "Isolation Solution Royal")).toBeNull();
    expect(contactFirstName({}, "ISR")).toBeNull();
  });
});
