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
    // Force a letter position and a wrong character: random retries can all
    // land on spaces/punctuation, legitimately producing no correction.
    const frames = buildTypingFrames(text, { typoChance: 1, rand: () => 0.5 });
    const wrong = frames.filter((f) => !text.startsWith(f.text));
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.length).toBeLessThanOrEqual(6);
  });
  it("délais 30–36 ms par lettre (~30 car./s) et pauses de ponctuation", () => {
    const frames = buildTypingFrames("abcdefghij", { typoChance: 0 });
    frames.forEach((f) => expect(f.delay).toBeGreaterThanOrEqual(30));
    frames.forEach((f) => expect(f.delay).toBeLessThanOrEqual(36));
    const punct = buildTypingFrames("a, b.", { typoChance: 0 });
    expect(punct[1].delay).toBeGreaterThanOrEqual(200);
    expect(punct[4].delay).toBeGreaterThanOrEqual(450);
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
