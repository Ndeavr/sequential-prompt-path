import { describe, it, expect } from "vitest";
import { getSpeechText } from "@/lib/brand/getSpeechText";

describe("getSpeechText — brand pronunciation lock", () => {
  // Detects spelled-out form: U-N-P-R-O with at least one separator between each letter.
  const forbiddenSpelledOut = /\bU[\s\.\-]N[\s\.\-]P[\s\.\-]R[\s\.\-]O\b/i;

  const variants = [
    "Bienvenue chez UNPRO",
    "Bienvenue chez U N Pro",
    "Bienvenue chez U-N-Pro",
    "Bienvenue chez U.N. PRO",
    "Bienvenue chez Une Pro",
    "Bienvenue chez You-en-pro",
    "Bienvenue chez Un-PRO",
  ];

  for (const v of variants) {
    it(`FR — never spells UNPRO in "${v}"`, () => {
      const { speechText } = getSpeechText(v, "fr-CA");
      expect(speechText).not.toMatch(forbiddenSpelledOut);
      expect(speechText.toLowerCase()).toContain("un pro");
    });

    it(`EN — resolves to Hun-pro for "${v}"`, () => {
      const { speechText } = getSpeechText(v, "en");
      expect(speechText).not.toMatch(forbiddenSpelledOut);
      expect(speechText.toLowerCase()).toContain("hun-pro");
    });
  }

  it("leaves display text untouched", () => {
    const { displayText } = getSpeechText("Bienvenue chez UNPRO", "fr-CA");
    expect(displayText).toBe("Bienvenue chez UNPRO");
  });
});
