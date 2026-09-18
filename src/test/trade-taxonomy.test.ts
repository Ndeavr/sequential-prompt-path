import { describe, expect, it } from "vitest";
import {
  detectTrade,
  normalizeTerm,
  searchTaxonomy,
  servicesForTrade,
  __test,
} from "@/hooks/useTradeTaxonomy";

const rows = [
  { id: "t-iso", slug: "isolation", name_fr: "Isolation", parent_id: null, sort_order: 1, ai_keywords: ["isolant", "insulation"] },
  { id: "t-plo", slug: "plomberie", name_fr: "Plomberie", parent_id: null, sort_order: 2, ai_keywords: ["plombier"] },
  { id: "t-pei", slug: "peinture", name_fr: "Peinture", parent_id: null, sort_order: 3, ai_keywords: ["peintre"] },
  { id: "s-ent", slug: "isolation-entretoit-combles", name_fr: "Isolation d'entretoit / combles", parent_id: "t-iso", sort_order: 10, ai_keywords: ["entretoit"] },
  { id: "s-ure", slug: "isolation-urethane", name_fr: "Isolation à l'uréthane giclé", parent_id: "t-iso", sort_order: 20, ai_keywords: ["urethane"] },
  { id: "s-int", slug: "peinture-interieure", name_fr: "Peinture intérieure", parent_id: "t-pei", sort_order: 10, ai_keywords: [] },
  { id: "s-cha", slug: "chauffe-eau", name_fr: "Chauffe-eau", parent_id: "t-plo", sort_order: 10, ai_keywords: [] },
];

const taxonomy = __test.buildTaxonomy(rows);

describe("taxonomie canonique des métiers", () => {
  it("sépare les métiers principaux de leurs sous-services", () => {
    expect(taxonomy.trades.map((t) => t.slug)).toEqual(["isolation", "plomberie", "peinture"]);
    expect(servicesForTrade(taxonomy, "isolation").map((s) => s.slug)).toEqual([
      "isolation-entretoit-combles",
      "isolation-urethane",
    ]);
  });

  it("ne propose jamais un autre métier comme sous-service", () => {
    const slugs = servicesForTrade(taxonomy, "isolation").map((s) => s.slug);
    expect(slugs).not.toContain("plomberie");
    expect(slugs).not.toContain("peinture-interieure");
    expect(slugs).not.toContain("chauffe-eau");
  });

  it("limite un peintre à ses propres sous-services", () => {
    expect(servicesForTrade(taxonomy, "peinture").map((s) => s.slug)).toEqual(["peinture-interieure"]);
  });

  it("détecte le métier réel depuis le nom d'entreprise", () => {
    expect(detectTrade(taxonomy, "Isolation Demrik Inc.")?.slug).toBe("isolation");
    expect(detectTrade(taxonomy, "Les Peintres du Nord")?.slug).toBe("peinture");
  });

  it("remonte au métier parent quand seul un sous-service est reconnu", () => {
    expect(detectTrade(taxonomy, "Entretoit Pro")?.slug).toBe("isolation");
  });

  it("ne devine rien quand aucun signal réel n'existe", () => {
    expect(detectTrade(taxonomy, "9123-4567 Québec inc.")).toBeNull();
    expect(detectTrade(taxonomy, "")).toBeNull();
    expect(servicesForTrade(taxonomy, null)).toEqual([]);
  });

  it("recherche sans accents ni casse, y compris via les sous-services", () => {
    expect(searchTaxonomy(taxonomy, "URETHANE").map((t) => t.slug)).toEqual(["isolation"]);
    expect(searchTaxonomy(taxonomy, "peintre").map((t) => t.slug)).toEqual(["peinture"]);
    expect(normalizeTerm("Isolation à l'uréthane")).toBe("isolation a l urethane");
  });

  it("un sous-service ne peut pas servir de métier principal", () => {
    expect(servicesForTrade(taxonomy, "isolation-urethane")).toEqual([]);
  });
});
