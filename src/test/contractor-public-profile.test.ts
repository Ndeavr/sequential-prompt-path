import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const publicExperience = readFileSync(
  "src/features/contractorProfile/public/ContractorPublicExperience.tsx",
  "utf8",
);
const legacyRoute = readFileSync("src/pages/ContractorProfile.tsx", "utf8");
const router = readFileSync("src/app/router.tsx", "utf8");
const privatePreview = readFileSync("src/pages/pro/PageProPublicProfile.tsx", "utf8");
const editor = readFileSync("src/pages/pro/ProProfile.tsx", "utf8");

describe("contractor public profile contract", () => {
  it("shows the six interactive sections and one public booking CTA", () => {
    for (const label of ["Aperçu", "Services", "Territoire", "Réalisations", "Vérifications", "Avis"]) {
      expect(publicExperience).toContain(`label: "${label}"`);
    }
    expect(publicExperience.match(/Planifier un rendez-vous/g)).toHaveLength(1);
  });

  it("uses an unknown compatibility state and contextual Clara handoff", () => {
    expect(publicExperience).toContain('"— %"');
    expect(publicExperience).toContain("Appuyez pour afficher votre score");
    expect(publicExperience).toContain("Recueillir seulement les renseignements manquants");
  });

  it("labels review provenance without fake review fallbacks", () => {
    expect(publicExperience).toContain('title="Avis UNPRO"');
    expect(publicExperience).toContain('title="Avis Google"');
    expect(publicExperience).toContain("Aucun avis public disponible.");
    expect(publicExperience).not.toContain("DEMO_REVIEWS");
  });

  it("shares the real profile in the legacy route and private preview", () => {
    expect(legacyRoute).toContain("ContractorPublicExperience");
    expect(privatePreview).toContain("ContractorPublicExperience");
    expect(privatePreview).toContain("Modifications enregistrées");
    expect(editor).toContain("state: { saved: true }");
  });

  it("resolves the ISR vanity URL to the canonical public experience without legacy claims", () => {
    const isrRoute = router.match(
      /<Route path="\/isolation-solution-royal"[^\n]+/,
    )?.[0];

    expect(isrRoute).toBeDefined();
    expect(isrRoute).toContain('ContractorProfile slug="isolation-solution-royal"');
    expect(isrRoute).not.toContain("PageSignaturePartner");

    const renderedPath = `${isrRoute ?? ""}\n${legacyRoute}\n${publicExperience}`;
    for (const forbidden of [
      "4.9",
      "320 avis Google",
      "Réserver maintenant",
      "Exemples illustratifs",
      "UNPRO Signature",
    ]) {
      expect(renderedPath).not.toContain(forbidden);
    }
  });

  it("contains none of the obsolete profile offers or controls", () => {
    const combined = `${publicExperience}\n${legacyRoute}\n${privatePreview}`;
    expect(combined).not.toMatch(/350\s*\$|1\s*\$|Vérifier ma compatibilité|Modifier mon profil/);
  });
});