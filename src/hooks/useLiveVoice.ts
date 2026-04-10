/**
 * useLiveVoice — Gemini Live (Native Audio) bidirectional voice hook.
 * 
 * Uses @google/genai SDK for real-time WebSocket audio streaming.
 * API key fetched securely from edge function (never hardcoded client-side).
 * Integrates with AlexSingleAudioChannel for guaranteed single-voice output.
 * 
 * Uses AudioWorklet for reliable mic capture (fallback to ScriptProcessorNode).
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
  onError?: (error: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
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

  const cleanup = useCallback(() => {
    // Stop worklet node
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Stop script processor (fallback)
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Revoke worklet blob URL
    if (workletBlobURLRef.current) {
      URL.revokeObjectURL(workletBlobURLRef.current);
      workletBlobURLRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Close session
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current?.state !== "closed") {
      try { inputAudioContextRef.current?.close(); } catch {}
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current?.state !== "closed") {
      try { outputAudioContextRef.current?.close(); } catch {}
    }
    outputAudioContextRef.current = null;

    // Stop all active audio sources
    activeSources.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    activeSources.current.clear();
    nextStartTime.current = 0;
    audioChunksSent.current = 0;

    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    callbacksRef.current?.onDisconnect?.();
  }, [cleanup]);

  /** Send PCM Int16 data to Gemini session */
  const sendPcmToGemini = useCallback((int16Data: Int16Array) => {
    if (!sessionRef.current) return;
    const base64 = encodeToBase64(new Uint8Array(int16Data.buffer));
    try {
      // Use new `audio` field instead of deprecated `media`
      sessionRef.current.sendRealtimeInput({
        audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
      });
      audioChunksSent.current++;
      if (audioChunksSent.current === 1) {
        console.log("[GeminiLive] ✅ First audio chunk sent, size:", int16Data.length, "samples");
      }
    } catch (err) {
      console.warn("[GeminiLive] Failed to send audio chunk:", err);
    }
  }, []);

  /** Set up microphone → Gemini pipeline using AudioWorklet (with ScriptProcessor fallback) */
  const setupMicPipeline = useCallback(async (
    stream: MediaStream,
    audioCtx: AudioContext
  ) => {
    const source = audioCtx.createMediaStreamSource(stream);

    // Try AudioWorklet first (more reliable, especially on mobile)
    try {
      const blobURL = createWorkletBlobURL();
      workletBlobURLRef.current = blobURL;
      await audioCtx.audioWorklet.addModule(blobURL);

      const workletNode = new AudioWorkletNode(audioCtx, "pcm-capture-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const { pcm } = event.data;
        if (pcm && pcm.length > 0) {
          sendPcmToGemini(pcm);
        } else {
          console.warn("[GeminiLive] Empty audio chunk from worklet");
        }
      };

      source.connect(workletNode);
      // AudioWorklet doesn't need to connect to destination
      console.log("[GeminiLive] ✅ AudioWorklet mic pipeline active (sampleRate:", audioCtx.sampleRate + ")");
      return;
    } catch (workletErr) {
      console.warn("[GeminiLive] AudioWorklet not supported, falling back to ScriptProcessor:", workletErr);
    }

    // Fallback: ScriptProcessorNode
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      if (inputData.length === 0) {
        console.warn("[GeminiLive] Empty ScriptProcessor buffer");
        return;
      }
      // Convert Float32 → Int16
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      sendPcmToGemini(int16);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    console.log("[GeminiLive] ⚠️ ScriptProcessor fallback active (sampleRate:", audioCtx.sampleRate + ")");
  }, [sendPcmToGemini]);

  // Listen for cleanup events — auto-stop if another Alex instance starts
  useEffect(() => {
    const handleCleanup = () => {
      if (sessionRef.current) {
        console.log("[GeminiLive] Received alex-voice-cleanup — stopping session");
        cleanup();
        callbacksRef.current?.onDisconnect?.();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [cleanup]);

  const start = useCallback(async (options?: { initialGreeting?: string }) => {
    if (isActive || isConnecting) return;

    // Only clean up THIS session's previous state
    cleanup();

    setIsConnecting(true);

    try {
      // 1. Fetch API key securely from edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        "alex-live-token"
      );

      if (tokenError || !tokenData?.apiKey) {
        throw new Error(tokenError?.message || "Impossible d'obtenir les credentials Gemini");
      }

      const apiKey = tokenData.apiKey;
      const voiceName = tokenData.voiceName || ALEX_LIVE_CONFIG.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName;

      // 2. Initialize Google GenAI
      const ai = new GoogleGenAI({ apiKey });

      // 3. Set up audio contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioCtx({ sampleRate: 16000 });

      // 4. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 5. Set up output audio context (Gemini outputs at 24kHz)
      outputAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      const outputGain = outputAudioContextRef.current.createGain();
      outputGain.connect(outputAudioContextRef.current.destination);

      // 6. Connect to Gemini Live
      // CRITICAL: Keep systemInstruction SHORT — long instructions cause immediate WebSocket close
      // (Known Gemini Live bug). Detailed rules are sent via sendClientContent after connect.
      const initialGreeting = options?.initialGreeting;

      const session = await ai.live.connect({
        model: tokenData.model || ALEX_LIVE_CONFIG.model,
        callbacks: {
          onopen: async () => {
            setIsActive(true);
            setIsConnecting(false);
            callbacksRef.current?.onConnect?.();

            // CRITICAL SEQUENCE: greeting FIRST, then mic.
            // Sending audio while a clientContent turn is in-flight causes 1007.

            // Step 1: Send instruction for Alex to speak the greeting aloud
            if (initialGreeting && sessionRef.current) {
              console.log("[GeminiLive] Sending greeting instruction:", initialGreeting);
              try {
                sessionRef.current.sendClientContent({
                  turns: [
                    { role: "user", parts: [{ text: `[INSTRUCTION SYSTÈME — NE PAS LIRE CE TEXTE] Dis exactement ceci à voix haute comme salutation d'ouverture, mot pour mot: "${initialGreeting}"` }] },
                  ],
                  turnComplete: true,
                });
              } catch (err) {
                console.warn("[GeminiLive] Failed to send initial greeting:", err);
              }
            }

            // Step 2: Wait briefly for server to process the greeting turn
            // before starting audio input (prevents 1007 race condition)
            await new Promise((r) => setTimeout(r, 300));

            // Step 3: Set up mic → Gemini pipeline
            if (inputAudioContextRef.current && mediaStreamRef.current) {
              await setupMicPipeline(mediaStreamRef.current, inputAudioContextRef.current);
            }

            // Diagnostic: warn if no audio sent after 3 seconds
            setTimeout(() => {
              if (audioChunksSent.current === 0 && sessionRef.current) {
                console.warn("[GeminiLive] ⚠️ No audio chunks sent after 3s — mic may not be working");
              }
            }, 3000);
          },

          onmessage: (message: LiveServerMessage) => {
            // Handle model output transcript
            if ((message as any).serverContent?.outputTranscription?.text) {
              const rawTranscript = (message as any).serverContent.outputTranscription.text;
              if (!isInternalThinking(rawTranscript) && !isBlockedOutput(rawTranscript)) {
                const cleaned = normalizeAlexOutputText(cleanAlexOutput(rawTranscript));
                if (cleaned && !isBlockedOutput(cleaned)) {
                  callbacksRef.current?.onTranscript?.(cleaned);
                }
              }
            }

            // Handle user transcript — normalize STT errors
            if ((message as any).serverContent?.inputTranscription?.text) {
              const rawTranscript = (message as any).serverContent.inputTranscription.text;
              const normalized = normalizeUserTranscript(rawTranscript);
              console.log("[GeminiLive] 🎤 User transcript:", rawTranscript, "→", normalized);
              callbacksRef.current?.onUserTranscript?.(normalized);
            }

            // Handle audio output
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData
            );
            const base64Audio = audioPart?.inlineData?.data;

            if (base64Audio && outputAudioContextRef.current) {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTime.current = Math.max(
                nextStartTime.current,
                ctx.currentTime
              );

              const audioBuffer = decodeAudioData(
                decodeFromBase64(base64Audio),
                ctx,
                24000,
                1
              );

              const bufferSource = ctx.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(outputGain);
              bufferSource.start(nextStartTime.current);
              nextStartTime.current += audioBuffer.duration;
              activeSources.current.add(bufferSource);

              bufferSource.onended = () => {
                activeSources.current.delete(bufferSource);
                if (activeSources.current.size === 0) {
                  setIsSpeaking(false);
                }
              };
            }

            // Handle turn completion
            if (message.serverContent?.turnComplete) {
              setIsSpeaking(false);
            }

            // Handle interruptions (user barge-in)
            if (message.serverContent?.interrupted) {
              activeSources.current.forEach((s) => {
                try { s.stop(); } catch {}
              });
              activeSources.current.clear();
              nextStartTime.current = 0;
              setIsSpeaking(false);
            }
          },

          onclose: (e: any) => {
            console.warn("[GeminiLive] WebSocket closed:", e?.code, e?.reason || "(no reason)");
            cleanup();
            callbacksRef.current?.onDisconnect?.();
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
          systemInstruction: {
            parts: [{ text: "Tu es Alex, concierge IA d'UnPRO.ca. Français international neutre, professionnel, sans accent régional. Tu es un agent décisionnel : tu agis, tu ne converses pas. Phrases courtes, maximum 2 phrases. Une seule question à la fois, uniquement si elle débloque une action. Jamais de markdown, listes, astérisques, code ou méta-commentaire. Ne verbalise jamais ton raisonnement interne. Ton calme, confiant, direct. Féminin : 'ravie', 'certaine', 'prête'. Micro-phrases : 'Je m'en occupe', 'C'est fait', 'J'ai trouvé', 'On bloque ça ?'" }],
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

      sessionRef.current = session;
    } catch (err: any) {
      console.error("[GeminiLive] Failed to start:", err);
      callbacksRef.current?.onError?.(err);
      cleanup();
    }
  }, [isActive, isConnecting, cleanup, setupMicPipeline]);

  return { start, stop, isActive, isConnecting, isSpeaking };
}
