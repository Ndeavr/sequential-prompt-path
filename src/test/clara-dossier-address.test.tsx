import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeDocument } from "@/components/dossier-maison/DossierMaisonSheet";

const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const sheet = readFileSync("src/components/dossier-maison/DossierMaisonSheet.tsx", "utf8");
const hook = readFileSync("src/hooks/useKeyboardAwareViewport.ts", "utf8");
const app = readFileSync("src/app/App.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");

describe("Dossier maison — adresse réelle et actions honnêtes", () => {
  it("garde Historique et Dossier maison distincts", () => {
    expect(box).toContain('<Home aria-hidden="true" /> Ma propriété');
    expect(box).toContain('aria-label="Voir mes conversations"');
  });
  it("utilise le sélecteur Google existant et une clé unique d'adresse", () => {
    expect(sheet).toContain("AddressVerifiedInput");
    expect(sheet).toContain("PROPERTY_ADDRESS_KEY");
    expect(sheet).toMatch(/provenance: verified \? "verified" : "pending"/);
  });
  it("remplace « C'est fait » par l'action réelle et n'avance qu'après sauvegarde", () => {
    expect(box).toContain("CHOOSE_ADDRESS");
    expect(box).toContain("dossierPendingRef.current && FAKE_DONE.test(option)");
    expect(box).toContain("onAddressSaved");
  });
  it("décrit les photos au lieu d'un nom numérique brut", () => {
    expect(describeDocument({ label: "1728391029384.jpg", detail: null })).toBe("Photo transmise");
    expect(describeDocument({ label: "Toit plat — vue arrière", detail: null })).toBe("Toit plat — vue arrière");
  });
  it("gère le clavier globalement, sans 100vh fixe", () => {
    expect(app).toContain("useKeyboardAwareViewport()");
    expect(hook).toContain("visualViewport");
    expect(hook).toContain('--app-visible-top');
    expect(hook).not.toContain('el.scrollTop = el.scrollHeight');
    expect(box).toContain('resize="instant"');
    expect(css).toContain("var(--app-visible-height, 100dvh)");
  });
});
