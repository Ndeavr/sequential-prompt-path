/**
 * useLiveVoice — Gemini Live (Native Audio) bidirectional voice hook.
 * 
 * Uses @google/genai SDK for real-time WebSocket audio streaming.
 * API key fetched securely from edge function (never hardcoded client-side).
 * Integrates with AlexSingleAudioChannel for guaranteed single-voice output.
 */
import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";
import { createPcmBlob, decodeFromBase64, decodeAudioData } from "@/services/geminiAudioCodec";
import { ALEX_SYSTEM_INSTRUCTION, ALEX_LIVE_CONFIG } from "@/services/alexConfig";
import { supabase } from "@/integrations/supabase/client";

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
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = useCallback(() => {
    // Stop script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
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

    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    callbacksRef.current?.onDisconnect?.();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (isActive || isConnecting) return;
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
      const session = await ai.live.connect({
        model: tokenData.model || ALEX_LIVE_CONFIG.model,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            callbacksRef.current?.onConnect?.();

            // Set up mic → Gemini pipeline
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e: AudioProcessingEvent) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              try {
                sessionRef.current?.sendRealtimeInput({ media: pcmBlob });
              } catch {}
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current!.destination);
          },

          onmessage: (message: LiveServerMessage) => {
            // Handle text transcript from model
            const textPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.text
            );
            if (textPart?.text) {
              callbacksRef.current?.onTranscript?.(textPart.text);
            }

            // Handle user transcript (input transcription)
            if ((message as any).serverContent?.inputTranscription?.text) {
              callbacksRef.current?.onUserTranscript?.(
                (message as any).serverContent.inputTranscription.text
              );
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

          onclose: () => {
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
          systemInstruction: ALEX_SYSTEM_INSTRUCTION,
          ...ALEX_LIVE_CONFIG.config.inputAudioTranscription !== undefined
            ? { inputAudioTranscription: ALEX_LIVE_CONFIG.config.inputAudioTranscription }
            : {},
          ...ALEX_LIVE_CONFIG.config.outputAudioTranscription !== undefined
            ? { outputAudioTranscription: ALEX_LIVE_CONFIG.config.outputAudioTranscription }
            : {},
          ...ALEX_LIVE_CONFIG.config.realtimeInputConfig !== undefined
            ? { realtimeInputConfig: ALEX_LIVE_CONFIG.config.realtimeInputConfig }
            : {},
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("[GeminiLive] Failed to start:", err);
      callbacksRef.current?.onError?.(err);
      cleanup();
    }
  }, [isActive, isConnecting, cleanup]);

  return { start, stop, isActive, isConnecting, isSpeaking };
}
