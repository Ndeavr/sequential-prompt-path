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
    expect(box).toContain("reconcileMessages(current");
    expect(box).toContain("CLARA_VOICE_MESSAGE_EVENT");
    expect(box).toContain("startOrResumeClaraSession");
  });

  it("rend seulement l’historique défilable et conserve le composer dans la colonne", () => {
    expect(css).toMatch(/\.home-light \.home-clara-main \{[\s\S]*?display: grid;[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto;[\s\S]*?min-height: 0;/);
    expect(css).toMatch(/\.home-light \.home-clara-conversation \{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/);
    expect(css).toMatch(/\.home-light \.home-clara-conversation > div \{[\s\S]*?overflow-y: auto/);
    expect(box).toContain('data-chat-row="commands"');
    expect(box).toContain('data-chat-row="composer"');
    expect(box).not.toContain("max-h-[38vh]");
  });

  it("garde le menu média ancré au composer et les menus bornés au viewport", () => {
    expect(box).toContain("function MediaMenu(");
    expect(box).toContain('aria-expanded={open}');
    expect(box).toContain("DropdownMenuContent");
    expect(box).not.toContain('role="menu" className="absolute bottom-full');
    expect(css).toContain("var(--app-visible-height, 100dvh)");
    expect(css).toMatch(/\.home-clara-media-menu[^}]*overflow-y: auto/);
  });

  it("expose un seul déclencheur média CameraPlus qui ouvre le menu sans lancer la caméra", () => {
    expect(box).toContain('import { CameraPlusIcon } from "@/components/icons/CameraPlusIcon";');
    expect(box).toContain('<CameraPlusIcon className="h-5 w-5" />');
    // Le bouton caméra autonome a disparu du composer : seule l'input cachée garde cette étiquette.
    expect(box.split("aria-label={copy.camera}").length - 1).toBe(1);
    expect(box).not.toContain("onClick={() => cameraRef.current?.click()}");
    // Les choix du menu restent intacts.
    for (const choice of [
      "Ajouter une photo",
      "Prendre une photo",
      "Joindre un document",
      "Ajouter une vidéo",
      "Prendre une vidéo",
      "Téléverser les soumissions",
      "Importer un plan",
    ]) {
      expect(box).toContain(`text: "${choice}"`);
    }
  });


  it("suit le clavier mobile avec le viewport dynamique sans déplacer le document", () => {
    expect(box).not.toContain("window.visualViewport");
    expect(box).not.toContain("scrollIntoView({ block: \"start\"");
    expect(css).toContain("100dvh");
    expect(css).toContain('html[data-clara-conversation-active="true"] body');
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
describe("Clara — retour au projet maison sans perte d’état", () => {
  const box2 = read("src/components/home-light/ClaraConversationBox.tsx");
  it("restaure le curseur maison sans « Où en étions-nous? »", () => {
    expect(box2).not.toContain("Où en étions-nous");
    expect(box2).toContain("readHomeCursor()");
    expect(box2).toContain("pauseActiveContractorFlow()");
    expect(box2).toContain('rememberClaraReferences({ current_intent: "PROJECT", detected_role: "HOMEOWNER" })');
  });
  it("évite les tours identiques consécutifs de Clara", () => {
    expect(box2).toContain("lastAssistant.text.trim() === text.trim()");
  });
});
