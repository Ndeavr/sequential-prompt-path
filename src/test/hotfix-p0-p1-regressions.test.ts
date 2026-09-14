/**
 * Régressions P0/P1 — conversion et observabilité UNPRO.
 * 1. Éligibilité offre gratuite : catégorie d'abord, exclusion rénovation ensuite.
 * 2. Permissions d'appel : raison exacte par statut de validation téléphonique.
 */
import { describe, it, expect } from "vitest";
import { normalizeServiceCategory } from "@/lib/localServices/categories";

describe("Éligibilité offre gratuite — ordre catégorie puis exclusion", () => {
  const eligible = [
    "Nettoyage de planchers",
    "Floor and tile cleaning",
    "Nettoyage de céramique et joints",
    "Basement cleanout service",
    "Vidange de sous-sol",
    "Nettoyage de cuisine commerciale",
    "Kitchen cleaning services",
    "Grand ménage résidentiel",
  ];

  for (const label of eligible) {
    it(`reste admissible : ${label}`, () => {
      expect(normalizeServiceCategory(label)).not.toBeNull();
    });
  }

  const excluded = [
    "Rénovation de salle de bain",
    "Entrepreneur général en construction",
    "Kitchen renovation contractor",
    "Pose de céramique et rénovation de plancher",
  ];

  for (const label of excluded) {
    it(`reste exclu : ${label}`, () => {
      expect(normalizeServiceCategory(label)).toBeNull();
    });
  }
});
