/**
 * Segment « services résidentiels locaux — 1 an gratuit ».
 *
 * Vérifie la NORMALISATION des catégories (aucun classement au hasard) et la
 * cohérence entre le module client et le miroir serveur utilisé par les
 * fonctions d'activation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  LOCAL_SERVICE_CATEGORIES,
  normalizeServiceCategory,
  categoryName,
} from "@/lib/localServices/categories";

describe("normalisation des catégories de services résidentiels", () => {
  it("reconnaît les libellés terrain de Laval", () => {
    expect(normalizeServiceCategory("Lavage de vitres résidentiel")).toBe("lavage-de-vitres");
    expect(normalizeServiceCategory("fermeture de piscine")).toBe("ouverture-fermeture-piscine");
    expect(normalizeServiceCategory("Installation abris TEMPO")).toBe("abris-temporaires");
    expect(normalizeServiceCategory("nettoyage de conduits d'air")).toBe("nettoyage-conduits");
    expect(normalizeServiceCategory("Exterminateur — punaises de lit")).toBe("gestion-parasitaire");
    expect(normalizeServiceCategory("tonte de pelouse")).toBe("entretien-gazon");
  });

  it("n'invente jamais de catégorie", () => {
    expect(normalizeServiceCategory("plomberie d'urgence")).toBeNull();
    expect(normalizeServiceCategory("")).toBeNull();
    expect(normalizeServiceCategory(null)).toBeNull();
  });

  it("expose un libellé français pour chaque slug", () => {
    for (const cat of LOCAL_SERVICE_CATEGORIES) {
      expect(categoryName(cat.slug)).toBe(cat.name_fr);
    }
    expect(new Set(LOCAL_SERVICE_CATEGORIES.map((c) => c.slug)).size).toBe(
      LOCAL_SERVICE_CATEGORIES.length,
    );
  });

  it("garde le miroir serveur identique (Deno ne peut pas importer src/)", () => {
    const client = readFileSync("src/lib/localServices/categories.ts", "utf8");
    const server = readFileSync("supabase/functions/_shared/localServiceCategories.ts", "utf8");
    const strip = (s: string) => s.slice(s.indexOf("export interface LocalServiceCategory"));
    expect(strip(server)).toBe(strip(client));
  });
});
