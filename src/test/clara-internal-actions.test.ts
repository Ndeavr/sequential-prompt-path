import { describe, expect, it } from "vitest";
import { cleanAlexText } from "@/utils/sanitizeAlexText";

describe("Clara — aucune syntaxe interne visible", () => {
  it("retire un appel open_modal avec contexte imbriqué", () => {
    const raw =
      'C\'est parfait. Je vais ouvrir votre dossier maison. open_modal(type: "property_onboarding", context: { city: "Laval" })';
    const out = cleanAlexText(raw);
    expect(out).not.toContain("open_modal");
    expect(out).not.toContain("property_onboarding");
    expect(out).toContain("dossier maison");
  });

  it("retire open_page et scroll_to", () => {
    const out = cleanAlexText('Je vous montre la section. open_page("/entrepreneurs/audit-ia") scroll_to(#plan)');
    expect(out).not.toMatch(/open_page|scroll_to/);
  });

  it("retire un appel tronqué pendant le streaming", () => {
    const out = cleanAlexText('J\'ouvre le formulaire. open_modal(type: "property');
    expect(out).not.toContain("open_modal");
  });

  it("préserve un texte humain normal", () => {
    const text = "Je cherche maintenant les entrepreneurs compatibles.";
    expect(cleanAlexText(text)).toBe(text);
  });
});
