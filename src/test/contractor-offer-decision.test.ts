/**
 * UNPRO — Décision d'offre entrepreneur.
 * Vérifie la normalisation de catégorie et le transport strict de la décision
 * serveur : aucune offre devinée, aucun nombre de places inventé.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeProjectTrade } from "@/lib/offers/projectTrades";
import {
  normalizeOfferCategory,
  freeOfferScarcitySentence,
} from "@/lib/offers/resolveContractorOffer";
import { normalizeServiceCategory } from "@/lib/localServices/categories";

describe("normalisation des catégories", () => {
  it("reconnaît les services résidentiels admissibles au gratuit", () => {
    expect(normalizeOfferCategory("Entretien ménager résidentiel")).toBe("entretien-menager");
    expect(normalizeOfferCategory("Lavage de vitres")).toBe("lavage-de-vitres");
    expect(normalizeOfferCategory("Junk removal")).toBe("debarras-ramassage");
  });

  it("route les métiers de projet vers un slug 350 $", () => {
    expect(normalizeProjectTrade("Couvreur")).toBe("toiture");
    expect(normalizeProjectTrade("Plomberie Tremblay")).toBe("plomberie");
    expect(normalizeProjectTrade("Excavation et drain français")).toBe("fondation-drain-excavation");
    expect(normalizeProjectTrade("Thermopompe et climatisation")).toBe("cvac-thermopompe");
    expect(normalizeProjectTrade("Décontamination vermiculite")).toBe("decontamination-vermiculite");
  });

  it("ne classe jamais au hasard un libellé inconnu", () => {
    expect(normalizeOfferCategory("Entreprise 12345")).toBeNull();
    expect(normalizeOfferCategory("")).toBeNull();
    expect(normalizeOfferCategory(null)).toBeNull();
  });

  it("garde la priorité aux services résidentiels sur les métiers de projet", () => {
    expect(normalizeServiceCategory("Nettoyage après construction")).toBe(
      "nettoyage-apres-construction",
    );
    expect(normalizeOfferCategory("Nettoyage après construction")).toBe(
      "nettoyage-apres-construction",
    );
  });
});

describe("phrase de rareté", () => {
  it("n'invente jamais un nombre de places", () => {
    expect(freeOfferScarcitySentence(null, "Laval")).not.toMatch(/\d+ places? à/);
    expect(freeOfferScarcitySentence(null, "Laval")).toContain("selon disponibilité");
  });

  it("affiche le nombre réel fourni par le serveur", () => {
    expect(freeOfferScarcitySentence(9, "Laval")).toBe("12 mois gratuits — il reste 9 places à Laval.");
    expect(freeOfferScarcitySentence(1, "Laval")).toBe("12 mois gratuits — il reste 1 place à Laval.");
    expect(freeOfferScarcitySentence(0, "Laval")).toBe("Les 10 places de lancement à Laval sont comblées.");
  });
});

describe("formulation publique", () => {
  it("n'annonce plus « 3 rendez-vous gratuits »", () => {
    const copy = readFileSync("src/lib/copy/contractorOffer.ts", "utf8");
    expect(copy).not.toMatch(/3 premiers rendez-vous sont gratuits/);
    expect(copy).not.toMatch(/freeAppointments/);
  });
});
