import { describe, it, expect } from "vitest";
import { prepareAlexSpeechText } from "@/lib/prepareAlexSpeechText";

describe("prepareAlexSpeechText", () => {
  it("rewrites d'UNPRO in French", () => {
    expect(prepareAlexSpeechText("Bonjour. Je suis Alex d'UNPRO.", "fr")).toBe(
      "Bonjour. Je suis Alex d'Un Pro.",
    );
  });

  it("handles curly apostrophe", () => {
    expect(prepareAlexSpeechText("Alex d’UNPRO ici.", "fr")).toBe(
      "Alex d'Un Pro ici.",
    );
  });

  it("rewrites standalone UNPRO in French", () => {
    expect(prepareAlexSpeechText("UNPRO vous aide à trouver un pro.", "fr")).toBe(
      "Un Pro vous aide à trouver un pro.",
    );
  });

  it("rewrites de UNPRO with elision", () => {
    expect(prepareAlexSpeechText("équipe de UNPRO arrive", "fr")).toBe(
      "équipe d'Un Pro arrive",
    );
  });

  it("rewrites UNPRO in English to Hun Pro", () => {
    expect(prepareAlexSpeechText("Welcome to UNPRO.", "en")).toBe(
      "Welcome to Hun Pro.",
    );
  });

  it("leaves unrelated text untouched", () => {
    expect(prepareAlexSpeechText("Bonjour comment ça va?", "fr")).toBe(
      "Bonjour comment ça va?",
    );
  });
});
