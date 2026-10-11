import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const conversation = readFileSync("src/components/ai-elements/conversation.tsx", "utf8");
const voice = readFileSync("src/components/voice/OverlayAlexVoiceFullScreen.tsx", "utf8");

describe("Clara — cycle de vie stable des messages", () => {
  it("met à jour le même message pendant la diffusion puis la finalisation", () => {
    expect(box).toContain('status?: "pending" | "streaming" | "complete" | "failed"');
    expect(box).toContain('m.id === assistantId ? { ...m, text: shown, status: "streaming" } : m');
    expect(box).toContain('m.id === assistantId ? { ...m, text: shownText, status: "complete" } : m');
  });

  it("conserve une réponse visible en cas d’échec", () => {
    expect(box).not.toContain("prev.filter((m) => m.id !== assistantId)");
    expect(box).toContain('text: m.text || copy.fallback, status: "failed"');
  });

  it("réconcilie la sauvegarde sans remplacer le fil visible", () => {
    expect(box).toContain("function reconcileMessages");
    expect(box).not.toContain("setMessages(state.messages.map((m)");
  });

  it("suit la croissance seulement près du bas et observe le viewport", () => {
    expect(conversation).toContain("distance <= 140");
    expect(conversation).toContain("observer.observe(content)");
    expect(conversation).toContain('window.visualViewport?.addEventListener("resize", follow)');
  });

  it("consolide les fragments vocaux dans le tour final", () => {
    expect(voice).toContain("onTranscriptPartial: (text)");
    expect(voice).toContain("onUserTranscriptPartial: (text)");
    expect(voice).toContain("partialAlexIdRef.current = null");
    expect(voice).toContain("partialUserIdRef.current = null");
    expect(voice).not.toContain("{ ...e, text: e.text + text }");
  });
});