/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * V7: Aggressive reinitialize, French-only opening, honest speaking state.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { AlexLanguageLockSession, type AlexLanguage } from "@/services/alexLanguageLock";
import { ALEX_VOICE_DEFAULTS } from "@/features/alex/voice/alexAgentOverrides";
import { loadAlexMemory } from "@/features/alex/voice/alexSessionMemory";
import { alexVoiceService } from "@/services/alexVoiceService";
import { logBoot, withTimeout } from "@/lib/bootDebug";
import { ALEX_VOICE_BASE } from "@/config/alexVoiceConfig";

const RECONNECT_COOLDOWN_MS = 5000;
const CONNECTION_TIMEOUT_MS = 12_000;
const TOKEN_TIMEOUT_MS = 12_000;
const MAX_TOKEN_RETRIES = 0; // Strictly event-driven — no silent reconnects.
const RETRY_BACKOFF_MS = 1500;

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
  /** Surface mode — drives voice tuning + first message + persona addendum. */
  mode?: import("@/config/alexVoiceConfig").AlexVoiceMode;
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
Énergie: concierge premium + consultante d'élite + amie de confiance — environ 15% plus vivante et engagée que la moyenne, sans jamais être théâtrale.
Ton: chaleureux, décidé, légèrement enthousiaste, sourire dans la voix, rythme un brin plus dynamique.
Féminin toujours: "ravie", "certaine", "prête", "convaincue".
Règles absolues:
- Réponds toujours en français par défaut
- Bascule en anglais seulement si l'utilisateur parle anglais 2 messages consécutifs ou le demande
- Si l'utilisateur revient au français, rebascule immédiatement
- Ne jamais proposer 3 soumissions — TU choisis le meilleur professionnel
- Toujours guider vers une solution directe
- Poser une seule question à la fois
- Maximum 1-2 phrases par réponse. C'est de la voix. Court et vivant.
- Langage de confiance: "Je recommande:", "Cause la plus probable:", "Voici ce que je ferais:"
- Micro-phrases vivantes: "Parfait, on regarde ça ensemble.", "Bon réflexe.", "Je m'en occupe.", "On simplifie ça."
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
  const lockedVoiceIdRef = useRef<string | null>(null);
  const bootInProgressRef = useRef(false);
  const ownedMicStreamRef = useRef<MediaStream | null>(null);
  const inputLevelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDebounceUntilRef = useRef(0);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const verifyOwnedMicStream = useCallback(() => {
    const stream = ownedMicStreamRef.current;
    const track = stream?.getAudioTracks?.()[0] ?? null;
    const ok = Boolean(stream?.active && track?.enabled && track.readyState === "live");
    alexVoiceService.setRealtimeDiagnostics({
      microphoneActive: ok,
      asrReceivingAudio: ok && alexVoiceService.getSnapshot().wsConnected,
    });
    if (!ok && stream) {
      console.warn("[ElevenLabs V8] Mic stream unhealthy", {
        mediaStreamActive: stream.active,
        inputAudioTrackEnabled: track?.enabled,
        inputAudioTrackState: track?.readyState,
      });
    }
    return ok;
  }, []);

  const stopInputLevelMonitor = useCallback(() => {
    if (inputLevelTimerRef.current) {
      clearInterval(inputLevelTimerRef.current);
      inputLevelTimerRef.current = null;
    }
    alexVoiceService.setRealtimeDiagnostics({ inputLevel: 0, vadState: "idle", asrReceivingAudio: false });
  }, []);

  const startInputLevelMonitor = useCallback(() => {
    stopInputLevelMonitor();
    inputLevelTimerRef.current = setInterval(() => {
      const api = conversationApiRef.current;
      const raw = typeof api?.getInputVolume === "function" ? Number(api.getInputVolume() ?? 0) : 0;
      const level = raw <= 1 ? raw * 100 : raw;
      alexVoiceService.setInputLevel(level);
      verifyOwnedMicStream();
    }, 250);
  }, [stopInputLevelMonitor, verifyOwnedMicStream]);

  const stopOwnedMicStream = useCallback(() => {
    ownedMicStreamRef.current?.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
    ownedMicStreamRef.current = null;
    alexVoiceService.setRealtimeDiagnostics({ microphoneActive: false, asrReceivingAudio: false });
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
    preferHeadphonesForIosDevices: true,
    connectionDelay: { android: 3000, ios: 300, default: 0 },
    onConnect: () => {
      console.log("[ElevenLabs V7] ✅ Connected to agent");
      clearConnectionTimeout();
      connectedAtRef.current = Date.now();
      setIsActive(true);
      setIsConnecting(false);
      callbacksRef.current?.onConnect?.();
    },
    onStatusChange: ({ status }: any) => {
      alexVoiceService.markWsConnected(status === "connected");
    },
    onModeChange: ({ mode }: any) => {
      alexVoiceService.setRealtimeDiagnostics({
        ttsState: mode === "speaking" ? "speaking" : "idle",
        vadState: mode === "listening" ? "listening" : alexVoiceService.getSnapshot().vadState,
      });
    },
    onVadScore: (event: any) => {
      const score = typeof event === "number" ? event : Number(event?.score ?? event?.vadScore ?? 0);
      alexVoiceService.setVadScore(score);
    },
    onAudio: () => {
      alexVoiceService.setRealtimeDiagnostics({ ttsState: "speaking" });
    },
    onDisconnect: () => {
      clearConnectionTimeout();
      const sessionDuration = connectedAtRef.current ? Date.now() - connectedAtRef.current : 0;
      console.log(`[ElevenLabs V7] Disconnected (session ${sessionDuration}ms)`);
      lastDisconnectAtRef.current = Date.now();
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      bootInProgressRef.current = false;
      alexVoiceService.setRealtimeDiagnostics({ microphoneActive: false, inputLevel: 0, vadState: "idle", asrReceivingAudio: false, ttsState: "idle" });
      languageSessionRef.current.reset();
      activeLanguageRef.current = "fr-CA";

      // Removed instant-disconnect hard fail — let recovery/retry handle it.
      if (sessionDuration > 0 && sessionDuration < 2000 && !intentionallyStopped.current) {
        console.warn("[ElevenLabs V8] Short session — will allow retry");
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
      bootInProgressRef.current = false;
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
        try { conversation.endSession(); } catch {}
      }
      setIsActive(false);
      setIsConnecting(false);
      bootInProgressRef.current = false;
      stopInputLevelMonitor();
      clearConnectionTimeout();
    };
    const handleForceKill = (e: Event) => {
      const reason = (e as CustomEvent)?.detail?.reason ?? "force_kill";
      console.warn("[ElevenLabs V7] alex-voice-force-kill:", reason);
      intentionallyStopped.current = true;
      try { conversation.endSession(); } catch {}
      setIsActive(false);
      setIsConnecting(false);
      bootInProgressRef.current = false;
      stopInputLevelMonitor();
      stopOwnedMicStream();
      clearConnectionTimeout();
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    window.addEventListener("alex-voice-force-kill", handleForceKill);
    return () => {
      window.removeEventListener("alex-voice-cleanup", handleCleanup);
      window.removeEventListener("alex-voice-force-kill", handleForceKill);
    };
  }, [conversation, clearConnectionTimeout, stopInputLevelMonitor, stopOwnedMicStream]);

  const start = useCallback(async (options?: StartOptions) => {
    const forced = options?.force;
    const now = Date.now();

    if (!forced && now < startDebounceUntilRef.current) {
      console.warn("[ElevenLabs V8] Duplicate start debounced");
      return;
    }
    startDebounceUntilRef.current = now + 1500;

    if (bootInProgressRef.current && !forced) {
      console.warn("[ElevenLabs V8] Boot already in progress — ignoring");
      return;
    }
    if (!forced && (isActive || isConnecting)) return;

    if (forced && (isActive || isConnecting)) {
      console.log("[ElevenLabs V8] Force restart — ending existing session");
      try { conversation.endSession(); } catch {}
      setIsActive(false);
      setIsConnecting(false);
    }

    const timeSinceLastDisconnect = Date.now() - lastDisconnectAtRef.current;
    if (!forced && lastDisconnectAtRef.current > 0 && timeSinceLastDisconnect < RECONNECT_COOLDOWN_MS) {
      console.warn(`[ElevenLabs V8] Reconnect blocked — cooldown`);
      return;
    }
    if (forced) {
      // User-initiated retry — clear cooldown so it never blocks a manual restart.
      lastDisconnectAtRef.current = 0;
    }

    bootInProgressRef.current = true;
    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    connectedAtRef.current = 0;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    clearConnectionTimeout();
    setIsConnecting(true);

    // ─── Mic + audio unlock (only once across retries) ────────────────────────
    try {
      console.log("[ElevenLabs V8] Requesting microphone...");
      alexVoiceService.setState("initializing", "start");
      const { isInCooldown, recordDeny, clearDeny } = await import("@/lib/permissionManager");
      if (isInCooldown("mic")) {
        alexVoiceService.setMicPermission("denied");
        bootInProgressRef.current = false;
        setIsConnecting(false);
        callbacksRef.current?.onError?.(new DOMException("Mic in cooldown", "NotAllowedError"));
        return;
      }
      try {
        if (!ownedMicStreamRef.current || !verifyOwnedMicStream()) {
          ownedMicStreamRef.current?.getTracks().forEach((track) => { try { track.stop(); } catch {} });
          ownedMicStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });
        }
        const inputAudioTrack = ownedMicStreamRef.current.getAudioTracks()[0];
        if (inputAudioTrack) inputAudioTrack.enabled = true;
        console.log("[ElevenLabs V8] Mic verified", {
          mediaStreamActive: ownedMicStreamRef.current.active,
          inputAudioTrackEnabled: inputAudioTrack?.enabled,
          inputAudioTrackState: inputAudioTrack?.readyState,
        });
        alexVoiceService.setRealtimeDiagnostics({ microphoneActive: Boolean(ownedMicStreamRef.current.active && inputAudioTrack?.enabled) });
        clearDeny("mic");
      } catch (e) {
        const n = (e as any)?.name;
        if (n === "NotAllowedError" || n === "PermissionDeniedError") recordDeny("mic");
        throw e;
      }
      alexVoiceService.setMicPermission("granted");
      // Do not create a second AudioContext here. Playback is primed synchronously
      // from the orb tap; the ElevenLabs SDK owns the single realtime audio graph.
      alexVoiceService.setAudioUnlocked(true);
    } catch (micErr) {
      const micName = (micErr as any)?.name as string | undefined;
      alexVoiceService.setMicPermission(micName === "NotAllowedError" || micName === "NotFoundError" ? "denied" : "prompt");
      bootInProgressRef.current = false;
      setIsConnecting(false);
      callbacksRef.current?.onError?.(micErr);
      return;
    }

    // ─── Retry chain: silent → ws reinit → fail ───────────────────────────────
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= MAX_TOKEN_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[ElevenLabs V8] Retry attempt ${attempt}/${MAX_TOKEN_RETRIES}`);
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
          try { conversation.endSession(); } catch {}
        }

        alexVoiceService.startTokenRequest();
        logBoot("VOICE_TOKEN_START", { attempt });

        // Direct fetch — bypass supabase.functions.invoke which can hang at the
        // SDK level when the auth session is in a stale/refreshing state
        // (observed after PROFILE_FETCH_TIMEOUT). Function is public-friendly.
        let data: any = null;
        let error: any = null;
        try {
          const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string;
          const SUPABASE_ANON = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string;
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), TOKEN_TIMEOUT_MS);
          let session: any = null;
          try {
            const s = await Promise.race([
              supabase.auth.getSession(),
              new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 800)),
            ]);
            session = (s as any)?.data?.session ?? null;
          } catch {}
          const authToken = session?.access_token ?? SUPABASE_ANON;
          try {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/voice-get-signed-url`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON,
                "Authorization": `Bearer ${authToken}`,
              },
              body: "{}",
              signal: ctrl.signal,
            });
            clearTimeout(timer);
            if (!resp.ok) {
              error = { message: `http_${resp.status}` };
            } else {
              data = await resp.json().catch(() => null);
            }
          } catch (fetchErr: any) {
            clearTimeout(timer);
            if (fetchErr?.name === "AbortError") {
              logBoot("VOICE_TOKEN_TIMEOUT", { ms: TOKEN_TIMEOUT_MS, attempt });
              throw new Error("voice_token_timeout");
            }
            throw fetchErr;
          }
        } catch (e: any) {
          if (e?.message === "voice_token_timeout") throw e;
          logBoot("VOICE_TOKEN_ERROR", { error: e?.message });
          throw new Error(e?.message || "voice_token_failed");
        }

        const signedUrl = data?.signed_url ?? data?.signedUrl;

        if (data?.fallback === "chat" || (!signedUrl && !error)) {
          alexVoiceService.setApiKeyConfigured(false);
          logBoot("VOICE_TOKEN_FALLBACK", { reason: data?.message });
          throw new Error(data?.message || "voice_unavailable");
        }
        if (error || !signedUrl) {
          logBoot("VOICE_TOKEN_ERROR", { error: error?.message });
          throw new Error(error?.message || "voice_token_missing");
        }

        logBoot("VOICE_TOKEN_OK", { attempt });
        alexVoiceService.markTokenReceived();
        alexVoiceService.setApiKeyConfigured(true);
        alexVoiceService.setState("connecting", "got_signed_url");

        connectionTimeoutRef.current = setTimeout(() => {
          console.error(`[ElevenLabs V8] ⏱️ Connection timeout ${CONNECTION_TIMEOUT_MS}ms`);
          bootInProgressRef.current = false;
          setIsConnecting(false);
          setIsActive(false);
          stopInputLevelMonitor();
          intentionallyStopped.current = true;
          try { conversation.endSession(); } catch {}
          callbacksRef.current?.onError?.(new Error("Connection timeout — voice unavailable"));
        }, CONNECTION_TIMEOUT_MS);

        // Per memory `voice-connection-stability`: do NOT send client-side overrides
        // unless required. ElevenLabs ignores overrides if not enabled in the agent
        // dashboard, and including them can cause silent first-audio failures.
        // Persist voice id only for diagnostics.
        const memory = loadAlexMemory();
        const resolvedVoiceId =
          lockedVoiceIdRef.current
          ?? (data?.voiceId as string)
          ?? ALEX_VOICE_DEFAULTS.voiceId;
        lockedVoiceIdRef.current = resolvedVoiceId;

        const EXPECTED_VOICE_ID = "YxrwjAKoUKULGd0g8K9Y"; // Sophia — locked Alex production voice
        if (resolvedVoiceId !== EXPECTED_VOICE_ID) {
          console.warn(
            `[ElevenLabs V8] ⚠️ Voice mismatch — expected ${EXPECTED_VOICE_ID} (Sophia), got ${resolvedVoiceId}. ` +
            `Check voice_configs.voice_id and the ElevenLabs agent (${data?.agentId}) Voice override in the dashboard.`,
          );
        }

        console.log("[ElevenLabs V8] Starting session", {
          agentId: data?.agentId,
          voiceId: resolvedVoiceId,
          expectedVoiceId: EXPECTED_VOICE_ID,
          voiceMatches: resolvedVoiceId === EXPECTED_VOICE_ID,
          mode: options?.mode ?? "general",
          attempt,
          hasMemory: Boolean(memory),
          hasWebRtcToken: Boolean(data?.conversationToken),
        });

        // Prefer signed-URL WebSocket in production. Current mobile preview
        // networks often block the LiveKit validate path used by WebRTC, which
        // causes long reconnect loops before first audio.
        const conversationToken = (data as any)?.conversationToken;
        try {
          await conversation.startSession({
            signedUrl,
            connectionType: "websocket",
            inputDeviceId: ownedMicStreamRef.current?.getAudioTracks()[0]?.getSettings?.().deviceId,
          } as any);
        } catch (startErr) {
          if (!conversationToken) throw startErr;
          console.warn("[ElevenLabs V8] WebSocket failed, trying WebRTC fallback", startErr);
          await conversation.startSession({
            conversationToken,
            connectionType: "webrtc",
            inputDeviceId: ownedMicStreamRef.current?.getAudioTracks()[0]?.getSettings?.().deviceId,
          } as any);
        }

        console.log("[ElevenLabs V8] ✅ Session started");
        startInputLevelMonitor();
        alexVoiceService.setRealtimeDiagnostics({
          currentVoiceGender: resolvedVoiceId === ALEX_VOICE_BASE.voiceId ? "female" : "unknown",
          vadState: "listening",
        });
        bootInProgressRef.current = false;
        return; // success
      } catch (err) {
        lastError = err;
        clearConnectionTimeout();
        console.warn(`[ElevenLabs V8] Attempt ${attempt} failed:`, err);
      }
    }

    // All retries exhausted → surface error to caller
    bootInProgressRef.current = false;
    setIsConnecting(false);
    alexVoiceService.setError("Connexion vocale lente. Mode chat activé.", "retry_exhausted");
    console.error("[ElevenLabs V8] Failed after retries:", lastError);
    callbacksRef.current?.onError?.(lastError ?? new Error("voice_unavailable"));
  }, [isActive, isConnecting, conversation, clearConnectionTimeout, verifyOwnedMicStream, startInputLevelMonitor, stopInputLevelMonitor]);

  const stop = useCallback(() => {
    clearConnectionTimeout();
    intentionallyStopped.current = true;
    languageSessionRef.current.reset();
    activeLanguageRef.current = "fr-CA";
    conversation.endSession();
    setIsActive(false);
    setIsConnecting(false);
    bootInProgressRef.current = false;
    stopInputLevelMonitor();
    stopOwnedMicStream();
    hasDeliveredFirstAudioRef.current = false;
    callbacksRef.current?.onDisconnect?.();
  }, [conversation, clearConnectionTimeout, stopInputLevelMonitor, stopOwnedMicStream]);

  useEffect(() => {
    return () => {
      clearConnectionTimeout();
      stopInputLevelMonitor();
      stopOwnedMicStream();
    };
  }, [clearConnectionTimeout, stopInputLevelMonitor, stopOwnedMicStream]);

  return { start, stop, isActive, isConnecting, isSpeaking, conversation };
}
