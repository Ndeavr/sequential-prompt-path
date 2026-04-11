/**
 * useLiveVoice — Gemini Live (Native Audio) bidirectional voice hook.
 * 
 * Uses @google/genai SDK for real-time WebSocket audio streaming.
 * API key fetched securely from edge function (never hardcoded client-side).
 * 
 * FIXED: Removed sendClientContent greeting (causes WebSocket 1007 close).
 * Greeting is now part of systemInstruction only.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity, ActivityHandling } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";
import { encodeToBase64, decodeFromBase64, decodeAudioData } from "@/services/geminiAudioCodec";
import { ALEX_LIVE_CONFIG } from "@/services/alexConfig";
import { createWorkletBlobURL } from "@/services/geminiAudioWorklet";
import { supabase } from "@/integrations/supabase/client";
import { isInternalThinking, cleanAlexOutput } from "@/services/alexTranscriptNormalizer";
import { normalizeUserTranscript, normalizeAlexOutputText } from "@/services/alexPronunciationNormalizer";
import { isBlockedOutput } from "@/hooks/useAlexPublicOutputFilter";

interface UseLiveVoiceCallbacks {
  onTranscript?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onFirstAudio?: () => void;
  onError?: (error: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const LIVE_CONNECT_TIMEOUT_MS = 12000;
const LIVE_POST_CONNECT_GRACE_MS = 1200;

function getFriendlyLiveCloseReason(code: number | null, reason: string | null) {
  if (!reason && !code) return "La session vocale s'est fermée pendant le démarrage.";
  if (reason?.includes("not found") || reason?.includes("bidiGenerateContent")) {
    return "Le moteur vocal n'est pas disponible avec ce modèle. Basculez au chat ou réessayez.";
  }
  if (code === 1008) {
    return "Le serveur vocal a refusé la session. Réessayez ou passez au chat.";
  }
  return reason || "La session vocale s'est fermée pendant le démarrage.";
}

export function useLiveVoice(callbacks?: UseLiveVoiceCallbacks) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTime = useRef<number>(0);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const workletBlobURLRef = useRef<string | null>(null);
  const audioChunksSent = useRef(0);
  const intentionallyStopped = useRef(false);
  const hasStableConnectionRef = useRef(false);
  const hasDeliveredFirstAudioRef = useRef(false);
  const lastCloseReasonRef = useRef<string | null>(null);
  const lastCloseCodeRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (workletBlobURLRef.current) {
      URL.revokeObjectURL(workletBlobURLRef.current);
      workletBlobURLRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
    if (inputAudioContextRef.current?.state !== "closed") {
      try { inputAudioContextRef.current?.close(); } catch {}
    }
    inputAudioContextRef.current = null;
    if (outputAudioContextRef.current?.state !== "closed") {
      try { outputAudioContextRef.current?.close(); } catch {}
    }
    outputAudioContextRef.current = null;
    activeSources.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    activeSources.current.clear();
    nextStartTime.current = 0;
    audioChunksSent.current = 0;
    hasStableConnectionRef.current = false;
    hasDeliveredFirstAudioRef.current = false;
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    intentionallyStopped.current = true;
    cleanup();
    callbacksRef.current?.onDisconnect?.();
  }, [cleanup]);

  const sendPcmToGemini = useCallback((int16Data: Int16Array) => {
    if (!sessionRef.current) return;
    const base64 = encodeToBase64(new Uint8Array(int16Data.buffer));
    try {
      sessionRef.current.sendRealtimeInput({
        audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
      });
      audioChunksSent.current++;
      if (audioChunksSent.current === 1) {
        console.log("[GeminiLive] ✅ First audio chunk sent");
      }
    } catch (err) {
      console.warn("[GeminiLive] Failed to send audio chunk:", err);
    }
  }, []);

  const setupMicPipeline = useCallback(async (
    stream: MediaStream,
    audioCtx: AudioContext
  ) => {
    const source = audioCtx.createMediaStreamSource(stream);

    try {
      const blobURL = createWorkletBlobURL();
      workletBlobURLRef.current = blobURL;
      await audioCtx.audioWorklet.addModule(blobURL);
      const workletNode = new AudioWorkletNode(audioCtx, "pcm-capture-processor");
      workletNodeRef.current = workletNode;
      workletNode.port.onmessage = (event) => {
        const { pcm } = event.data;
        if (pcm && pcm.length > 0) sendPcmToGemini(pcm);
      };
      source.connect(workletNode);
      console.log("[GeminiLive] ✅ AudioWorklet mic pipeline active");
      return;
    } catch (workletErr) {
      console.warn("[GeminiLive] AudioWorklet fallback to ScriptProcessor:", workletErr);
    }

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      if (inputData.length === 0) return;
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      sendPcmToGemini(int16);
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
    console.log("[GeminiLive] ⚠️ ScriptProcessor fallback active");
  }, [sendPcmToGemini]);

  useEffect(() => {
    const handleCleanup = () => {
      if (sessionRef.current) {
        console.log("[GeminiLive] Received alex-voice-cleanup — stopping");
        cleanup();
        callbacksRef.current?.onDisconnect?.();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [cleanup]);

  const start = useCallback(async (options?: { initialGreeting?: string }) => {
    if (isActive || isConnecting) return;

    cleanup();
    intentionallyStopped.current = false;
    setIsConnecting(true);

    try {
      // 1. Get API key
      console.log("[GeminiLive] Fetching API key...");
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("alex-live-token");
      if (tokenError || !tokenData?.apiKey) {
        throw new Error(tokenError?.message || "Impossible d'obtenir les credentials Gemini");
      }
      console.log("[GeminiLive] ✅ Got API key, model:", tokenData.model);
      lastCloseReasonRef.current = null;
      lastCloseCodeRef.current = null;
      hasStableConnectionRef.current = false;
      hasDeliveredFirstAudioRef.current = false;

      const apiKey = tokenData.apiKey;
      const voiceName = tokenData.voiceName || ALEX_LIVE_CONFIG.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName;
      const liveModel = tokenData.model || ALEX_LIVE_CONFIG.model;

      // 2. Get microphone FIRST (user gesture required)
      console.log("[GeminiLive] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log("[GeminiLive] ✅ Microphone granted");

      // 3. Audio contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      const outputGain = outputAudioContextRef.current.createGain();
      outputGain.connect(outputAudioContextRef.current.destination);

      // 4. Build system instruction WITH greeting baked in
      const greetingText = options?.initialGreeting || "Bonjour. Que puis-je faire pour vous?";
      const systemText = `Tu es Alex, concierge IA d'UnPRO.ca. Français international neutre, professionnel. Tu es un agent décisionnel : tu agis, tu ne converses pas. Phrases courtes, maximum 2 phrases. Une seule question à la fois. Jamais de markdown. Ne verbalise jamais ton raisonnement interne. Ton calme, confiant, direct. Féminin : 'ravie', 'certaine', 'prête'.

IMPORTANT: Commence IMMÉDIATEMENT la conversation en disant: "${greetingText}"
Ne dis rien d'autre avant cette salutation. Dis-la maintenant.`;

      const ai = new GoogleGenAI({ apiKey });

      // 5. Connect WebSocket
      console.log("[GeminiLive] Connecting WebSocket...");
      const connectPromise = ai.live.connect({
        model: liveModel,
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            // Output transcription
            if ((message as any).serverContent?.outputTranscription?.text) {
              const rawTranscript = (message as any).serverContent.outputTranscription.text;
              if (!isInternalThinking(rawTranscript) && !isBlockedOutput(rawTranscript)) {
                const cleaned = normalizeAlexOutputText(cleanAlexOutput(rawTranscript));
                if (cleaned && !isBlockedOutput(cleaned)) {
                  callbacksRef.current?.onTranscript?.(cleaned);
                }
              }
            }

            // User transcript
            if ((message as any).serverContent?.inputTranscription?.text) {
              const rawTranscript = (message as any).serverContent.inputTranscription.text;
              const normalized = normalizeUserTranscript(rawTranscript);
              console.log("[GeminiLive] 🎤 User:", normalized);
              callbacksRef.current?.onUserTranscript?.(normalized);
            }

            // Audio output
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData
            );
            const base64Audio = audioPart?.inlineData?.data;

            if (base64Audio && outputAudioContextRef.current) {
              if (!hasDeliveredFirstAudioRef.current) {
                hasDeliveredFirstAudioRef.current = true;
                callbacksRef.current?.onFirstAudio?.();
              }

              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);

              const audioBuffer = decodeAudioData(
                decodeFromBase64(base64Audio), ctx, 24000, 1
              );

              const bufferSource = ctx.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(outputGain);
              bufferSource.start(nextStartTime.current);
              nextStartTime.current += audioBuffer.duration;
              activeSources.current.add(bufferSource);

              bufferSource.onended = () => {
                activeSources.current.delete(bufferSource);
                if (activeSources.current.size === 0) setIsSpeaking(false);
              };
            }

            if (message.serverContent?.turnComplete) setIsSpeaking(false);

            // User barge-in
            if (message.serverContent?.interrupted) {
              activeSources.current.forEach((s) => { try { s.stop(); } catch {} });
              activeSources.current.clear();
              nextStartTime.current = 0;
              setIsSpeaking(false);
            }
          },

          onclose: (e: any) => {
            console.warn("[GeminiLive] WebSocket closed:", e?.code, e?.reason || "(no reason)");
            lastCloseCodeRef.current = e?.code ?? null;
            lastCloseReasonRef.current = e?.reason || null;
            const wasStable = hasStableConnectionRef.current;
            cleanup();
            // Only fire disconnect if we weren't intentionally stopped
            if (!intentionallyStopped.current && wasStable) {
              callbacksRef.current?.onDisconnect?.();
            }
          },

          onerror: (e: unknown) => {
            console.error("[GeminiLive] Error:", e);
            callbacksRef.current?.onError?.(e);
            cleanup();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: {
            parts: [{ text: systemText }],
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
              prefixPaddingMs: 20,
              silenceDurationMs: 140,
            },
            activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
          },
        },
      });

      let session: any;
      try {
        session = await Promise.race([
          connectPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Connexion Gemini Live expirée")), LIVE_CONNECT_TIMEOUT_MS);
          }),
        ]);
      } catch (connectErr) {
        console.error("[GeminiLive] ❌ Connect failed:", connectErr);
        throw connectErr;
      }

      sessionRef.current = session;

      await new Promise((resolve) => setTimeout(resolve, LIVE_POST_CONNECT_GRACE_MS));
      if (!sessionRef.current) {
        throw new Error(getFriendlyLiveCloseReason(lastCloseCodeRef.current, lastCloseReasonRef.current));
      }

      hasStableConnectionRef.current = true;
      console.log("[GeminiLive] ✅ WebSocket connected!");
      setIsActive(true);
      setIsConnecting(false);
      callbacksRef.current?.onConnect?.();

      // Wait a moment then start mic to avoid any race condition.
      await new Promise((r) => setTimeout(r, 500));

      // Resume audio contexts
      if (inputAudioContextRef.current?.state === "suspended") {
        await inputAudioContextRef.current.resume().catch(() => {});
      }
      if (outputAudioContextRef.current?.state === "suspended") {
        await outputAudioContextRef.current.resume().catch(() => {});
      }

      // Start mic pipeline
      if (inputAudioContextRef.current && mediaStreamRef.current) {
        await setupMicPipeline(mediaStreamRef.current, inputAudioContextRef.current);
      }

      // Trigger model to speak the greeting proactively
      // Gemini Live does NOT speak from systemInstruction alone — needs a client turn
      if (sessionRef.current && options?.initialGreeting) {
        try {
          sessionRef.current.sendClientContent({
            turns: [{ role: "user", parts: [{ text: `[Instructions: Dis maintenant ta salutation d'accueil. Voici le contexte: ${options.initialGreeting}]` }] }],
            turnComplete: true,
          });
          console.log("[GeminiLive] ✅ Greeting trigger sent");
        } catch (e) {
          console.warn("[GeminiLive] Failed to send greeting trigger:", e);
        }
      }

      setTimeout(() => {
        if (audioChunksSent.current === 0 && sessionRef.current) {
          console.warn("[GeminiLive] ⚠️ No audio chunks sent after 3s — mic may not be working");
        }
      }, 3000);
    } catch (err: any) {
      console.error("[GeminiLive] Failed to start:", err);
      callbacksRef.current?.onError?.(err);
      cleanup();
    }
  }, [isActive, isConnecting, cleanup, setupMicPipeline]);

  return { start, stop, isActive, isConnecting, isSpeaking };
}
