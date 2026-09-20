/**
 * ONE CLARA — la voix est un canal de la même conversation, jamais une seconde Clara.
 *
 * Ces tests protègent trois garanties :
 *  1. la voix reprend l'état canonique au lieu de saluer à nouveau;
 *  2. chaque parole devient un message normal, visible dans le chat;
 *  3. aucune parole n'est dupliquée ni cachée dans un historique séparé.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildVoiceFirstMessage,
  buildVoiceResumeContext,
  type ClaraVoiceBrief,
} from "@/services/clara/claraVoiceBridge";

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

const brief = (overrides: Partial<ClaraVoiceBrief> = {}): ClaraVoiceBrief => ({
  session_id: "session-1",
  has_conversation: true,
  current_step: "qualification",
  last_intent: "PROJECT",
  project_type: "balcon",
  project_city: "Montréal",
  language: "fr",
  role: "homeowner",
  pending_question: "Est-ce un balcon au rez-de-chaussée ou à l'étage ?",
  recent: [
    { role: "user", text: "Refaire balcon" },
    { role: "assistant", text: "Est-ce un balcon au rez-de-chaussée ou à l'étage ?" },
  ],
  refs: {},
  ...overrides,
});

describe("Clara voice — reprise de la conversation canonique", () => {
  it("ne salue jamais quand une question est déjà affichée", () => {
    expect(buildVoiceFirstMessage(brief())).toBe("Je vous écoute.");
  });

  it("poursuit sans salutation quand la conversation est en cours", () => {
    const message = buildVoiceFirstMessage(brief({ pending_question: null }));
    expect(message).toBeTruthy();
    expect(message).not.toMatch(/bonjour/i);
  });

  it("laisse la salutation habituelle quand aucune conversation n'existe", () => {
    expect(buildVoiceFirstMessage(brief({ has_conversation: false }))).toBeNull();
    expect(buildVoiceFirstMessage(null)).toBeNull();
  });

  it("transmet l'état réel et la question en attente, sans historique brut complet", () => {
    const context = buildVoiceResumeContext(brief()) ?? "";
    expect(context).toContain("balcon");
    expect(context).toContain("Montréal");
    expect(context).toContain("Est-ce un balcon au rez-de-chaussée ou à l'étage ?");
    expect(context).toMatch(/ne te présente pas/i);
  });

  it("n'envoie aucun contexte quand il n'y a rien à reprendre", () => {
    expect(buildVoiceResumeContext(brief({ has_conversation: false }))).toBeNull();
  });
});

describe("Clara voice — transcription visible dans le chat", () => {
  const bridge = read("src/services/clara/claraVoiceBridge.ts");
  const overlay = read("src/components/voice/OverlayAlexVoiceFullScreen.tsx");
  const box = read("src/components/home-light/ClaraConversationBox.tsx");

  it("écrit chaque tour parlé dans la conversation canonique", () => {
    expect(bridge).toContain("appendClaraMessage");
    expect(bridge).toContain("clientMessageId");
    expect(overlay).toContain('recordClaraVoiceTurn("user", text)');
    expect(overlay).toContain('recordClaraVoiceTurn("assistant", text)');
  });

  it("n'ouvre aucune seconde session conversationnelle", () => {
    expect(bridge).not.toMatch(/alex_conversation_sessions/);
    expect(bridge).toContain("clara-session");
  });

  it("affiche les paroles dans le chat en direct puis recharge l'état serveur", () => {
    expect(box).toContain("CLARA_VOICE_MESSAGE_EVENT");
    expect(box).toContain("CLARA_VOICE_CLOSED_EVENT");
    expect(box).toContain("startOrResumeClaraSession");
  });

  it("ne relance pas l'agent avec une salutation quand une conversation existe", () => {
    expect(overlay).toContain("!claraBriefRef.current?.has_conversation");
  });
});
