/**
 * P0 — portes dures du jumelage canonique (`supabase/functions/match-lead`) :
 *  - le territoire exige une zone de service explicite ;
 *  - les sous-catégories du calculateur se rattachent à `renovation-generale` ;
 *  - la licence RBQ doit être vérifiée, datée et non expirée ;
 *  - un jumelage refusé n'est jamais réutilisé au rejeu.
 */
import { describe, expect, it } from "vitest";
import {
  REFUSED_RESPONSE_STATES,
  canonicalCategorySlug,
  rbqGatePasses,
  servesCityGate,
} from "../../supabase/functions/match-lead/gates";

describe("territoire", () => {
  it("accepte une zone de service explicite, accents ignorés", () => {
    expect(servesCityGate(["Montréal", "Laval"], "montreal")).toBe(true);
  });

  it("refuse quand aucune zone de service ne correspond", () => {
    expect(servesCityGate(["Laval"], "Terrebonne")).toBe(false);
  });

  it("refuse quand l'entrepreneur n'a aucune zone de service", () => {
    expect(servesCityGate([], "Laval")).toBe(false);
  });

  it("refuse quand la demande n'a pas de ville", () => {
    expect(servesCityGate(["Laval"], null)).toBe(false);
  });
});

describe("catégorie canonique", () => {
  it.each([
    "cuisine",
    "salle_de_bain",
    "sous_sol",
    "garage",
    "aire_de_vie",
    "renovation_complete",
  ])("rattache %s à renovation-generale", (ui) => {
    expect(canonicalCategorySlug(ui)).toBe("renovation-generale");
  });

  it("conserve une catégorie déjà canonique", () => {
    expect(canonicalCategorySlug("toiture")).toBe("toiture");
  });

  it("retourne null sans catégorie", () => {
    expect(canonicalCategorySlug("")).toBeNull();
    expect(canonicalCategorySlug(null)).toBeNull();
  });
});

describe("licence RBQ", () => {
  const base = {
    rbq_number: "1234-5678-01",
    rbq_compliance_status: "verified",
    rbq_verified_at: "2026-01-01T00:00:00Z",
    rbq_expiry_date: null as string | null,
  };

  it("accepte une licence vérifiée, datée et non expirée", () => {
    expect(rbqGatePasses(base)).toBe(true);
  });

  it.each([
    ["numéro manquant", { rbq_number: "" }],
    ["statut non vérifié", { rbq_compliance_status: "in_progress" }],
    ["jamais vérifiée", { rbq_verified_at: null }],
    ["expirée", { rbq_expiry_date: "2020-01-01T00:00:00Z" }],
  ])("refuse : %s", (_label, override) => {
    expect(rbqGatePasses({ ...base, ...override })).toBe(false);
  });
});

describe("rejeu idempotent", () => {
  it("traite les états refusés comme non réutilisables", () => {
    for (const s of ["declined", "rejected", "expired", "cancelled"]) {
      expect(REFUSED_RESPONSE_STATES.has(s)).toBe(true);
    }
    expect(REFUSED_RESPONSE_STATES.has("pending")).toBe(false);
    expect(REFUSED_RESPONSE_STATES.has("accepted")).toBe(false);
  });
});
