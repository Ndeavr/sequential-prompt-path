import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const voice = readFileSync("src/components/voice/OverlayAlexVoiceFullScreen.tsx", "utf8");
const bridge = readFileSync("src/services/clara/claraVoiceBridge.ts", "utf8");

describe("Clara — transition entrepreneur", () => {
  const phrase = "Je vois, vous aimeriez obtenir plus de contrats. Commençons par analyser votre entreprise…";

  it("affiche et persiste la réponse avant la navigation texte", () => {
    expect(bridge).toContain(phrase);
    expect(box.indexOf("appendClaraMessage({")).toBeLessThan(box.indexOf("await finishContractorTransition(note)"));
    expect(box).toContain('suggestion.intent === "contractor_onboarding"');
    expect(box).toContain("contractorTransitionRef.current");
  });

  it("respecte le mouvement réduit et garde la pause Clara", () => {
    expect(box).toContain('(prefers-reduced-motion: reduce)');
    expect(box).toContain("setTransitionPause(true)");
    expect(box).toContain("window.setTimeout(resolve, TRANSITION_READ_MS)");
  });

  it("attend la fin ou l'annulation réelle de la voix avant la navigation", () => {
    expect(voice).toContain("Promise.race([speech, waitForClose])");
    expect(voice).toContain('recordClaraVoiceTurn("assistant", CLARA_CONTRACTOR_TRANSITION_TEXT)');
    expect(voice).toContain("CLARA_CONTRACTOR_VOICE_FINISHED_EVENT");
    expect(box).toContain("CLARA_CONTRACTOR_VOICE_FINISHED_EVENT");
  });
});