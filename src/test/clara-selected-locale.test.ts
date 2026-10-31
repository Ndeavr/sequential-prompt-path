import { describe, expect, it } from "vitest";
import { localizeClaraScript } from "@/services/clara/claraLocale";

describe("Clara — explicit UI locale", () => {
  it("localizes the exact homeowner greeting shown after Find my professional", () => {
    const source = "Bien sûr. Décrivez-moi votre projet pour votre propriété en quelques mots.";
    expect(localizeClaraScript(source, "en")).toBe("Of course. Tell me about your property project in a few words.");
    expect(localizeClaraScript(source, "fr")).toBe(source);
  });

  it("localizes the scripted contractor and RBQ questions without changing facts", () => {
    expect(localizeClaraScript("Parfait. Quel est votre métier principal ?", "en")).toContain("primary trade");
    expect(localizeClaraScript("J'ai une licence RBQ", "en")).toBe("I have an RBQ licence");
    expect(localizeClaraScript("Autre situation", "en")).toBe("Another situation");
  });

  it("preserves other historical content and user-originated text verbatim", () => {
    expect(localizeClaraScript("Clara checked 123 Rue Example", "en")).toBe("Clara checked 123 Rue Example");
  });
});
