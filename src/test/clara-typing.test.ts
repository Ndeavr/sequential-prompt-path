import { describe, expect, it } from "vitest";
import { buildTypingFrames } from "@/services/clara/claraTyping";

const text = "Dans quelle(s) ville(s) travaillez-vous surtout ?";

describe("Clara — écriture progressive", () => {
  it("termine toujours sur le texte exact", () => {
    for (let i = 0; i < 50; i += 1) {
      const frames = buildTypingFrames(text, { typoChance: 1 });
      expect(frames[frames.length - 1].text).toBe(text);
    }
  });
  it("au plus une autocorrection, 1 à 3 caractères, puis effacement", () => {
    const frames = buildTypingFrames(text, { typoChance: 1 });
    const wrong = frames.filter((f) => !text.startsWith(f.text));
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.length).toBeLessThanOrEqual(6);
  });
  it("délais 44–56 ms par lettre", () => {
    const frames = buildTypingFrames("abcdefghij", { typoChance: 0 });
    frames.forEach((f) => expect(f.delay).toBeGreaterThanOrEqual(44));
    frames.forEach((f) => expect(f.delay).toBeLessThanOrEqual(56));
  });
  it("mouvement réduit : aucune fausse correction", () => {
    const frames = buildTypingFrames(text, { reducedMotion: true });
    frames.forEach((f) => expect(text.startsWith(f.text)).toBe(true));
    expect(frames).toEqual([{ text, delay: 0 }]);
  });
  it("borne les messages longs à 16 secondes", () => {
    expect(buildTypingFrames("Un long message. ".repeat(300)).reduce((sum, frame) => sum + frame.delay, 0)).toBeLessThanOrEqual(16001);
  });
});
