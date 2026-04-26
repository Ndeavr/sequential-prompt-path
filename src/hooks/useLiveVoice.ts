/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * V7: Aggressive reinitialize, French-only opening, honest speaking state.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { AlexLanguageLockSession, type AlexLanguage } from "@/services/alexLanguageLock";
import { buildAlexAgentOverrides, ALEX_VOICE_DEFAULTS } from "@/features/alex/voice/alexAgentOverrides";
import { loadAlexMemory, buildMemoryContextHint } from "@/features/alex/voice/alexSessionMemory";

const RECONNECT_COOLDOWN_MS = 5000;
const CONNECTION_TIMEOUT_MS = 5_000;

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
  force?: boolean;
  /** First name to inject into the V2 first message. */
  firstName?: string | null;
  /** Returning user → "Rebonjour" greeting variant. */
  isReturning?: boolean;
}

// V7: French-only default greeting — never English for opening
function getDefaultGreeting(): string {
  return "Bonjour. Quel projet avance aujourd'hui?";
}

function sanitizeGreeting(text: string) {
  return text.replace(/"/g, '\\"').trim();
}

// V7: Always inject French persona context for opening
function buildSessionContext(lang: AlexLanguage, initialGreeting?: string) {
  const greeting = sanitizeGreeting(initialGreeting || getDefaultGreeting());

  if (lang === "en-CA") {
    return `You are Alex from UNPRO. Calm, sharp, warm, confident, elegant.
Active language: English.
Identity: Premium female AI concierge for residential services in Quebec.
Energy: Luxury concierge + elite consultant + trusted friend.
Core rules:
- Speak natural Canadian English
- Stay concise: 1-2 sentences max per reply
- Ask only one question at a time
- Never propose 3 quotes — YOU choose the best professional
- Guide toward diagnosis, estimate, professional recommendation, and booking
- Trust language: "Best next step:", "I recommend:", "Most likely cause:", "Here's what I'd do:"
- Never say "I'm just an AI", "absolutely", "sure thing", "no worries"
- If the user clearly switches back to French, switch immediately
Start now by saying: "${greeting}"`;
  }

  return `Tu es Alex d'UNPRO. Femme intelligente, calme, élégante, confiante, chaleureuse.
Langue active: français québécois.
Identité: Concierge IA premium pour les services résidentiels au Québec.
Énergie: luxury concierge + consultante d'élite + amie de confiance.
Féminin toujours: "ravie", "certaine", "prête", "convaincue".
Règles absolues:
- Réponds toujours en français par défaut
- Bascule en anglais seulement si l'utilisateur parle anglais 2 messages consécutifs ou le demande
- Si l'utilisateur revient au français, rebascule immédiatement
- Ne jamais proposer 3 soumissions — TU choisis le meilleur professionnel
- Toujours guider vers une solution directe
- Poser une seule question à la fois
- Maximum 1-2 phrases par réponse. C'est de la voix. Court.
- Langage de confiance: "Je recommande:", "Cause la plus probable:", "Voici ce que je ferais:"
- Micro-phrases: "Je m'en occupe.", "Je vous guide.", "Bon choix.", "On simplifie ça."
- Jamais "je suis une IA", "absolument", "en effet", "n'hésitez pas"
- Ne jamais inventer si info manquante
Logique: 1. Comprendre le symptôme 2. Déduire le problème 3. Proposer estimation 4. Recommander professionnel 5. Prise de rendez-vous
Commence maintenant en disant: "${greeting}"`;
}

function buildLanguageSwitchContext(lang: AlexLanguage) {
  return lang === "en-CA"
    ? "Active language update: switch to natural Canadian English immediately. Stay in English until the user clearly returns to French."
    : "Mise à jour de langue active : repasse immédiatement en français québécois naturel et reste en français tant que l'utilisateur ne revient pas clairement à l'anglais.";
}

function getExplicitLanguageRequest(text: string): AlexLanguage | null {
  const lower = text.toLowerCase();
  if (/\b(english please|speak english|in english|switch to english|anglais|en anglais)\b/i.test(lower)) return "en-CA";
  if (/\b(french please|speak french|in french|switch to french|français|en français)\b/i.test(lower)) return "fr-CA";
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
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const sendAgentContext = useCallback((context: string, successLog?: string) => {
    const api = conversationApiRef.current;
    if (typeof api?.sendContextualUpdate === "function") {
      api.sendContextualUpdate(context);
      if (successLog) console.log(successLog);
      return true;
    }
    console.warn("[ElevenLabs] sendContextualUpdate not available");
    return false;
  }, []);

  const syncAgentLanguage = useCallback((nextLanguage: AlexLanguage) => {
    if (nextLanguage === activeLanguageRef.current) return;
    activeLanguageRef.current = nextLanguage;
    const label = nextLanguage === "en-CA" ? "EN" : "FR";
    console.log(`[ElevenLabs] 🌐 Language switched to ${label}`);
    sendAgentContext(buildLanguageSwitchContext(nextLanguage), `[ElevenLabs] ✅ Language context pushed (${label})`);
  }, [sendAgentContext]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs V7] ✅ Connected to agent");
      clearConnectionTimeout();
      connectedAtRef.current = Date.now();
      setIsActive(true);
      setIsConnecting(false);
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      clearConnectionTimeout();
      const sessionDuration = connectedAtRef.current ? Date.now() - connectedAtRef.current : 0;
      console.log(`[ElevenLabs V7] Disconnected (session ${sessionDuration}ms)`);
      lastDisconnectAtRef.current = Date.now();
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      languageSessionRef.current.reset();
      activeLanguageRef.current = "fr-CA";

      if (sessionDuration > 0 && sessionDuration < 2000 && !intentionallyStopped.current) {
        console.error("[ElevenLabs V7] ⚠️ Instant disconnect — likely config issue");
        callbacksRef.current?.onError?.(new Error("Session disconnected immediately"));
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
      console.error("[ElevenLabs V7] Error:", error);
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
        console.log("[ElevenLabs V7] Received alex-voice-cleanup — stopping");
        conversation.endSession();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [conversation]);

  const start = useCallback(async (options?: StartOptions) => {
    // V7: If force=true, allow restart even if active/connecting
    const forced = options?.force;

    if (!forced && (isActive || isConnecting)) return;

    // V7: Aggressive reinitialize — end any existing session first
    if (forced && (isActive || isConnecting)) {
      console.log("[ElevenLabs V7] Force restart — ending existing session");
      try { conversation.endSession(); } catch {}
      setIsActive(false);
      setIsConnecting(false);
    }

    const timeSinceLastDisconnect = Date.now() - lastDisconnectAtRef.current;
    if (!forced && lastDisconnectAtRef.current > 0 && timeSinceLastDisconnect < RECONNECT_COOLDOWN_MS) {
      console.warn(`[ElevenLabs V7] Reconnect blocked — cooldown`);
      return;
    }

    // V7: Full state reset for clean session
    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    connectedAtRef.current = 0;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    clearConnectionTimeout();
    setIsConnecting(true);

    try {
      console.log("[ElevenLabs V7] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs V7] ✅ Microphone granted");

      console.log("[ElevenLabs V7] Fetching signed URL...");
      const { data, error } = await supabase.functions.invoke("voice-get-signed-url");
      const signedUrl = data?.signed_url ?? data?.signedUrl;

      if (error || !signedUrl) {
        throw new Error(error?.message || "Impossible d'obtenir l'URL de connexion");
      }

      console.log("[ElevenLabs V7] ✅ Got signed URL");

      // 5s connection timeout — NO retry, instant fallback
      connectionTimeoutRef.current = setTimeout(() => {
        console.error(`[ElevenLabs V7] ⏱️ Connection timeout after ${CONNECTION_TIMEOUT_MS}ms — giving up`);
        setIsConnecting(false);
        setIsActive(false);
        try { conversation.endSession(); } catch {}
        callbacksRef.current?.onError?.(new Error("Connection timeout — voice unavailable"));
      }, CONNECTION_TIMEOUT_MS);

      await conversation.startSession({ signedUrl });

      console.log("[ElevenLabs V7] ✅ Session started");
      // V7: Always inject French persona for opening
      sendAgentContext(
        buildSessionContext("fr-CA", options?.initialGreeting),
        "[ElevenLabs V7] ✅ Alex persona injected (fr-CA)"
      );
    } catch (err: unknown) {
      clearConnectionTimeout();
      console.error("[ElevenLabs V7] Failed to start:", err);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(err);
    }
  }, [isActive, isConnecting, conversation, sendAgentContext, clearConnectionTimeout]);

  const stop = useCallback(() => {
    clearConnectionTimeout();
    intentionallyStopped.current = true;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    conversation.endSession();
    setIsActive(false);
    setIsConnecting(false);
    hasDeliveredFirstAudioRef.current = false;
    callbacksRef.current?.onDisconnect?.();
  }, [conversation, clearConnectionTimeout]);

  useEffect(() => {
    return () => { clearConnectionTimeout(); };
  }, [clearConnectionTimeout]);

  return { start, stop, isActive, isConnecting, isSpeaking, conversation };
}
