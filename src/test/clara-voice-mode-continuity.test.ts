/**
 * ONE CLARA — le micro change de canal, jamais de conversation.
 * Tests A–G : texte→voix, voix→texte, alternance, aucune redemande,
 * aucun nouveau « Bonjour », fil unique, reprise après rechargement.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildVoiceFirstMessage,
  buildVoiceResumeContext,
  type ClaraVoiceBrief,
} from "@/services/clara/claraVoiceBridge";
import { shouldSuggestVoice } from "@/components/home-light/ClaraConversationBox";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const brief = (over: Partial<ClaraVoiceBrief> = {}): ClaraVoiceBrief => ({
  session_id: "s1",
  has_conversation: true,
  current_step: "qualification",
  last_intent: "affiliate_onboarding",
  project_type: null,
  project_city: null,
  language: "fr",
  role: "affiliate",
  pending_question: "Avez-vous besoin d'aide pour remplir une section ?",
  recent: [
    { role: "assistant", text: "Avez-vous besoin d'aide pour remplir une section ?" },
  ],
  refs: {},
  ...over,
});

describe("Clara — la voix poursuit la conversation canonique", () => {
  it("A/E — contexte de reprise sans présentation ni redémarrage", () => {
    const context = buildVoiceResumeContext(brief()) ?? "";
    expect(context).toContain("Ne te présente pas");
    expect(context).toContain("Ne recommence pas la conversation");
    expect(context).toContain("Ne redemande jamais une information déjà connue");
    expect(context).toContain("Étape : qualification");
  });

  it("D/I — la première phrase parlée répond à la question en attente", () => {
    const context = buildVoiceResumeContext(brief()) ?? "";
    expect(context).toContain("traite sa première phrase comme la réponse à cette question");
  });

  it("E — jamais de chaîne vide : le message d'accueil par défaut ne peut pas s'imposer", () => {
    expect(buildVoiceFirstMessage(brief())).toBe("Je vous écoute.");
    expect(buildVoiceFirstMessage(brief({ pending_question: null }))).toBe("Je vous écoute, on continue.");
    expect(buildVoiceFirstMessage(brief({ has_conversation: false }))).toBeNull();
  });

  it("C/G — la session canonique existe avant la voix et rien n'est recréé", () => {
    const bridge = read("src/services/clara/claraVoiceBridge.ts");
    expect(bridge).toContain("export async function ensureClaraVoiceSession");
    expect(bridge).toContain("await ensureClaraVoiceSession();");
    expect(bridge).not.toContain("startNewClaraSession");
  });

  it("F — chaque tour parlé devient un message normal du même fil", () => {
    const bridge = read("src/services/clara/claraVoiceBridge.ts");
    expect(bridge).toContain("appendClaraMessage");
    expect(bridge).toContain('messageType: "voice"');
  });

  it("B — fermer la voix revient au texte sans nouvelle session", () => {
    const box = read("src/components/home-light/ClaraConversationBox.tsx");
    expect(box).toContain("setVoiceActive(false)");
    expect(box).toContain('mode: "text"');
    expect(box).not.toContain("createVoiceConversation");
  });

  it("secours — aucune salutation rejouée quand une conversation est en cours", () => {
    const overlay = read("src/components/voice/OverlayAlexVoiceFullScreen.tsx");
    expect(overlay).toContain("hasGreeted() || claraBriefRef.current?.has_conversation");
  });
});

describe("Clara — suggestion vocale contextuelle", () => {
  const base = { userMessageCount: 1, uploading: false, voiceActive: false, lastUserText: "" };

  it("suggère la voix sur une question ouverte", () => {
    expect(
      shouldSuggestVoice({ ...base, lastAssistantText: "Décrivez-moi ce qui se passe avec votre toiture ?" }),
    ).toBe(true);
  });

  it("ne suggère jamais la voix pour une donnée courte", () => {
    expect(shouldSuggestVoice({ ...base, lastAssistantText: "Quelle est votre adresse courriel ?" })).toBe(false);
    expect(shouldSuggestVoice({ ...base, lastAssistantText: "Quel est votre numéro de téléphone ?" })).toBe(false);
  });

  it("ne suggère pas la voix pendant un envoi ni quand la voix est active", () => {
    const open = "Expliquez-moi la situation ?";
    expect(shouldSuggestVoice({ ...base, lastAssistantText: open, uploading: true })).toBe(false);
    expect(shouldSuggestVoice({ ...base, lastAssistantText: open, voiceActive: true })).toBe(false);
  });

  it("suggère la voix après un long message écrit", () => {
    expect(
      shouldSuggestVoice({
        ...base,
        lastAssistantText: "D'accord, et ensuite ?",
        lastUserText: "a".repeat(180),
      }),
    ).toBe(true);
  });

  it("le halo reste discret et respecte le mouvement réduit", () => {
    const css = read("src/index.css");
    expect(css).toContain("rgba(20, 130, 255, 0.28)");
    expect(css).toContain("claraMicBreathe 3s ease-in-out infinite");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("le micro transforme le composeur en écoute dans la même carte", () => {
    const box = read("src/components/home-light/ClaraConversationBox.tsx");
    expect(box).toContain('data-voice-listening={voiceActive ? "true" : undefined}');
    expect(box).toContain("copy.listening");
  });
});
