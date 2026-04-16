/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 *
 * Uses @elevenlabs/react useConversation for WebSocket-based
 * real-time voice conversation with an ElevenLabs agent.
 *
 * IMPORTANT:
 * - Agent identity/voice is resolved server-side via ELEVENLABS_AGENT_ID
 * - No client overrides are passed to startSession (stability on mobile)
 * - French is the default language, with controlled switching to English
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { AlexLanguageLockSession, type AlexLanguage } from "@/services/alexLanguageLock";

const RECONNECT_COOLDOWN_MS = 5000;

interface UseLiveVoiceCallbacks {
  onTranscript?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onFirstAudio?: () => void;
  onError?: (error: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface StartOptions {
  initialGreeting?: string;
}

function getDefaultGreeting(lang: AlexLanguage) {
  return lang === "en-CA"
    ? "Hello. How can I help you?"
    : "Bonjour. Comment puis-je vous aider?";
}

function sanitizeGreeting(text: string) {
  return text.replace(/"/g, '\\"').trim();
}

function buildSessionContext(lang: AlexLanguage, initialGreeting?: string) {
  const greeting = sanitizeGreeting(initialGreeting || getDefaultGreeting(lang));

  if (lang === "en-CA") {
    return `You are Alex from UNPRO.
Active language: English.
Core rules:
- Speak natural Canadian English
- Stay concise, direct, and helpful
- Ask only one question at a time
- Never propose 3 quotes
- Guide toward diagnosis, estimate, professional recommendation, and booking
- If the user clearly switches back to French, switch back to French
Start now by saying: "${greeting}"`;
  }

  return `Tu es Alex de UNPRO.
Langue active: français québécois.
Règles absolues:
- Réponds toujours en français par défaut
- Bascule en anglais canadien naturel seulement si l'utilisateur parle anglais clairement pendant 2 messages consécutifs ou le demande explicitement
- Si l'utilisateur revient clairement au français, rebascule immédiatement en français
- Ne jamais proposer 3 soumissions
- Toujours guider vers une solution directe
- Poser une seule question à la fois
- Ne jamais inventer si info manquante
- Toujours prioriser clarté, rapidité, action
Logique: 1. Comprendre le symptôme 2. Déduire le problème 3. Proposer estimation 4. Recommander professionnel 5. Amener vers prise de rendez-vous
Comportement: Court, Direct, Utile, Proactif.
Commence maintenant en disant: "${greeting}"`;
}

function buildLanguageSwitchContext(lang: AlexLanguage) {
  return lang === "en-CA"
    ? "Active language update: switch to natural Canadian English immediately. Stay in English until the user clearly returns to French."
    : "Mise à jour de langue active : repasse immédiatement en français québécois naturel et reste en français tant que l'utilisateur ne revient pas clairement à l'anglais.";
}

function getExplicitLanguageRequest(text: string): AlexLanguage | null {
  const lower = text.toLowerCase();

  if (
    /\b(english please|speak english|in english|switch to english|anglais|en anglais)\b/i.test(lower)
  ) {
    return "en-CA";
  }

  if (
    /\b(french please|speak french|in french|switch to french|français|en français)\b/i.test(lower)
  ) {
    return "fr-CA";
  }

  return null;
}

export function useLiveVoice(callbacks?: UseLiveVoiceCallbacks) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const intentionallyStopped = useRef(false);
  const hasDeliveredFirstAudioRef = useRef(false);
  const connectedAtRef = useRef<number>(0);
  const lastDisconnectAtRef = useRef<number>(0);
  const conversationApiRef = useRef<any>(null);
  const languageSessionRef = useRef(new AlexLanguageLockSession());
  const activeLanguageRef = useRef<AlexLanguage>("fr-CA");

  const sendAgentContext = useCallback((context: string, successLog?: string) => {
    const api = conversationApiRef.current;
    if (typeof api?.sendContextualUpdate === "function") {
      api.sendContextualUpdate(context);
      if (successLog) console.log(successLog);
      return true;
    }

    console.warn("[ElevenLabs] sendContextualUpdate not available — relying on agent config");
    return false;
  }, []);

  const syncAgentLanguage = useCallback((nextLanguage: AlexLanguage) => {
    if (nextLanguage === activeLanguageRef.current) return;
    activeLanguageRef.current = nextLanguage;

    const label = nextLanguage === "en-CA" ? "EN" : "FR";
    console.log(`[ElevenLabs] 🌐 Language switched to ${label}`);
    sendAgentContext(
      buildLanguageSwitchContext(nextLanguage),
      `[ElevenLabs] ✅ Language context pushed (${label})`
    );
  }, [sendAgentContext]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to agent");
      connectedAtRef.current = Date.now();
      setIsActive(true);
      setIsConnecting(false);
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      const sessionDuration = connectedAtRef.current ? Date.now() - connectedAtRef.current : 0;
      console.log(`[ElevenLabs] Disconnected from agent (session lasted ${sessionDuration}ms)`);
      lastDisconnectAtRef.current = Date.now();
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      languageSessionRef.current.reset();
      activeLanguageRef.current = "fr-CA";

      if (sessionDuration > 0 && sessionDuration < 2000 && !intentionallyStopped.current) {
        console.error("[ElevenLabs] ⚠️ Instant disconnect detected — likely a config issue");
        callbacksRef.current?.onError?.(new Error("Session disconnected immediately — check agent config"));
        return;
      }

      if (!intentionallyStopped.current) {
        callbacksRef.current?.onDisconnect?.();
      }
    },
    onMessage: (message: any) => {
      const msgType = (message as any)?.type as string | undefined;

      if (msgType === "agent_response") {
        const text = (message as any)?.agent_response_event?.agent_response as string | undefined;
        if (text) {
          if (!hasDeliveredFirstAudioRef.current) {
            hasDeliveredFirstAudioRef.current = true;
            callbacksRef.current?.onFirstAudio?.();
          }
          callbacksRef.current?.onTranscript?.(text);
        }
      }

      if (msgType === "user_transcript") {
        const text = (message as any)?.user_transcription_event?.user_transcript as string | undefined;
        if (text && text.trim().length >= 2) {
          callbacksRef.current?.onUserTranscript?.(text);

          const explicitLanguage = getExplicitLanguageRequest(text);
          if (explicitLanguage) {
            languageSessionRef.current.forceLock(explicitLanguage);
            syncAgentLanguage(explicitLanguage);
            return;
          }

          const nextLanguage = languageSessionRef.current.processUtterance(text);
          syncAgentLanguage(nextLanguage);
        }
      }
    },
    onError: (error: unknown) => {
      console.error("[ElevenLabs] Error:", error);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(error);
    },
  });

  conversationApiRef.current = conversation as any;

  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    if (isSpeaking && !hasDeliveredFirstAudioRef.current) {
      hasDeliveredFirstAudioRef.current = true;
      callbacksRef.current?.onFirstAudio?.();
    }
  }, [isSpeaking]);

  useEffect(() => {
    const handleCleanup = () => {
      if (conversation.status === "connected") {
        console.log("[ElevenLabs] Received alex-voice-cleanup — stopping");
        conversation.endSession();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [conversation]);

  const start = useCallback(async (options?: StartOptions) => {
    if (isActive || isConnecting) return;

    const timeSinceLastDisconnect = Date.now() - lastDisconnectAtRef.current;
    if (lastDisconnectAtRef.current > 0 && timeSinceLastDisconnect < RECONNECT_COOLDOWN_MS) {
      console.warn(`[ElevenLabs] Reconnect blocked — cooldown (${timeSinceLastDisconnect}ms < ${RECONNECT_COOLDOWN_MS}ms)`);
      return;
    }

    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    connectedAtRef.current = 0;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    setIsConnecting(true);

    try {
      console.log("[ElevenLabs] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone granted");

      console.log("[ElevenLabs] Fetching signed URL via voice-get-signed-url...");
      const { data, error } = await supabase.functions.invoke("voice-get-signed-url");
      const signedUrl = data?.signed_url ?? data?.signedUrl;

      if (error || !signedUrl) {
        throw new Error(error?.message || "Impossible d'obtenir l'URL de connexion");
      }

      console.log("[ElevenLabs] ✅ Got signed URL", data?.agentId ? { agentId: data.agentId } : "");

      await conversation.startSession({
        signedUrl,
      });

      console.log("[ElevenLabs] ✅ Session started");
      sendAgentContext(
        buildSessionContext("fr-CA", options?.initialGreeting),
        "[ElevenLabs] ✅ Alex persona injected (FR-first, EN switch enabled)"
      );
    } catch (err: unknown) {
      console.error("[ElevenLabs] Failed to start:", err);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(err);
    }
  }, [isActive, isConnecting, conversation, sendAgentContext]);

  const stop = useCallback(() => {
    intentionallyStopped.current = true;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    conversation.endSession();
    setIsActive(false);
    setIsConnecting(false);
    hasDeliveredFirstAudioRef.current = false;
    callbacksRef.current?.onDisconnect?.();
  }, [conversation]);

  return { start, stop, isActive, isConnecting, isSpeaking, conversation };
}
