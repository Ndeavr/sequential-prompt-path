import { describe, expect, it } from "vitest";
import {
  DOSSIER_SECTIONS,
  PROVENANCE_LABEL,
  mentionsDossier,
} from "@/services/clara/claraDossier";

describe("Dossier maison", () => {
  it("reconnaît l'annonce de Clara pour ouvrir réellement le dossier", () => {
    expect(mentionsDossier("Je vais l'ajouter à votre dossier maison.")).toBe(true);
    expect(mentionsDossier("J'ouvre votre dossier maison.")).toBe(true);
    expect(mentionsDossier("Parlez-moi de votre toiture.")).toBe(false);
  });

  it("expose les quatre niveaux de vérité, sans promotion implicite", () => {
    expect(PROVENANCE_LABEL.verified).toBe("Vérifié");
    expect(PROVENANCE_LABEL.declared).toBe("Déclaré");
    expect(PROVENANCE_LABEL.inferred).toBe("Inféré");
    expect(PROVENANCE_LABEL.pending).toBe("À confirmer");
  });

  it("couvre les sections attendues du dossier", () => {
    const keys = DOSSIER_SECTIONS.map((section) => section.key);
    expect(keys).toEqual([
      "property",
      "project",
      "document",
      "contractor",
      "quote",
      "appointment",
      "note",
    ]);
  });
});
