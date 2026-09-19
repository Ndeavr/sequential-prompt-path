import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const box = read("src/components/home-light/ClaraConversationBox.tsx");
const voice = read("src/components/voice/OverlayAlexVoiceFullScreen.tsx");
const css = read("src/index.css");
const hero = read("src/components/home-light/HeroHomeownerLight.tsx");

describe("ONE CLARA — carte mobile et voix intégrée", () => {
  it("ouvre le moteur vocal existant dans la carte sans mode plein écran mobile", () => {
    expect(box).toContain('openAlex("home_hero", "user_tapped_orb", "floating")');
    expect(box).toContain('id="home-clara-voice-slot"');
    expect(voice).toContain('document.getElementById("home-clara-voice-slot")');
    expect(voice).toContain("createPortal(inlinePanel, homeVoiceSlot)");
    expect(voice).toContain("useLiveVoice({");
  });

  it("garde une seule conversation canonique et le transcript visible", () => {
    expect(voice).toContain('recordClaraVoiceTurn("user", text)');
    expect(voice).toContain('recordClaraVoiceTurn("assistant", text)');
    expect(box).toContain("CLARA_VOICE_MESSAGE_EVENT");
    expect(box).toContain("startOrResumeClaraSession");
  });

  it("rend seulement l’historique défilable et conserve le composer dans la colonne", () => {
    expect(css).toMatch(/\.home-light \.home-clara-main \{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;[\s\S]*?min-height: 0;/);
    expect(css).toMatch(/\.home-light \.home-clara-conversation \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
    expect(css).toMatch(/\.home-light \.home-clara-composer \{[\s\S]*?flex: 0 0 auto;/);
    expect(box).not.toContain("max-h-[38vh]");
  });

  it("suit le clavier mobile et laisse le document défiler", () => {
    expect(box).toContain("window.visualViewport");
    expect(box).toContain("--clara-keyboard-offset");
    expect(css).toContain("100dvh");
    expect(hero).not.toContain("overflow-hidden");
  });

  it("préserve les médias et la fermeture complète de la voix", () => {
    expect(box).toContain("enqueueMedia(files)");
    expect(box).toContain("runQuoteAnalysis");
    expect(voice).toContain("elevenlabsService.stop()");
    expect(voice).toContain("try { stop(); } catch {}");
    expect(voice).toContain('closeVoiceSession("user_explicit_close")');
  });

  it("instrumente le cycle demandé sans données conversationnelles", () => {
    for (const event of [
      "clara_chat_opened",
      "clara_voice_started",
      "clara_voice_connected",
      "clara_voice_ended",
      "clara_voice_error",
      "clara_input_mode_changed",
      "clara_upload_started",
      "clara_upload_completed",
      "clara_upload_failed",
      "clara_new_conversation",
    ]) {
      expect(box + voice).toContain(event);
    }
  });
});