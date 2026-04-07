/**
 * useAlexAudioCapture — Professional mic capture with noise gate and VAD.
 * Captures PCM 16-bit mono 16kHz from user mic.
 * Applies client-side noise gate before forwarding audio.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { createWorkletBlobURL } from "@/services/geminiAudioWorklet";

export interface NoiseGateConfig {
  noiseFloorDb: number;
  speechOpenThreshold: number;
  speechCloseThreshold: number;
  minimumOpenMs: number;
  trailingCloseMs: number;
}

const DEFAULT_NOISE_GATE: NoiseGateConfig = {
  noiseFloorDb: -50,
  speechOpenThreshold: 0.18,
  speechCloseThreshold: 0.08,
  minimumOpenMs: 180,
  trailingCloseMs: 450,
};

export type AudioCaptureState = 
  | "idle" 
  | "calibrating" 
  | "listening" 
  | "speech_detected" 
  | "closed";

interface AudioCaptureCallbacks {
  onAudioFrame?: (pcm: Int16Array) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onRmsUpdate?: (rms: number) => void;
  onError?: (error: unknown) => void;
}

export function useAlexAudioCapture(
  callbacks?: AudioCaptureCallbacks,
  noiseConfig?: Partial<NoiseGateConfig>
) {
  const [state, setState] = useState<AudioCaptureState>("idle");
  const [currentRms, setCurrentRms] = useState(0);

  const config = { ...DEFAULT_NOISE_GATE, ...noiseConfig };
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcRef = useRef<ScriptProcessorNode | null>(null);
  const blobURLRef = useRef<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rmsIntervalRef = useRef<number | null>(null);

  // Noise gate state
  const noiseFloorRef = useRef<number>(0);
  const isSpeechOpenRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);
  const calibrationSamplesRef = useRef<number[]>([]);
  const isCalibrating = useRef(false);

  const calculateRms = useCallback((data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }, []);

  const processAudioFrame = useCallback((int16Data: Int16Array) => {
    // Convert to float for RMS calculation
    const floatData = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      floatData[i] = int16Data[i] / 32768;
    }
    const rms = calculateRms(floatData);
    setCurrentRms(rms);
    callbacksRef.current?.onRmsUpdate?.(rms);

    // Calibration phase: collect noise floor samples
    if (isCalibrating.current) {
      calibrationSamplesRef.current.push(rms);
      if (calibrationSamplesRef.current.length >= 20) { // ~400ms at typical chunk rate
        const avgNoise = calibrationSamplesRef.current.reduce((a, b) => a + b, 0) / calibrationSamplesRef.current.length;
        noiseFloorRef.current = avgNoise * 1.5; // 50% above ambient
        isCalibrating.current = false;
        setState("listening");
        console.log("[AudioCapture] Calibration done. Noise floor:", avgNoise.toFixed(4), "→ gate:", noiseFloorRef.current.toFixed(4));
      }
      return; // Don't forward audio during calibration
    }

    // Noise gate logic
    const now = Date.now();
    const effectiveThreshold = Math.max(noiseFloorRef.current, config.speechOpenThreshold * 0.01);
    const closeThreshold = Math.max(noiseFloorRef.current * 0.8, config.speechCloseThreshold * 0.01);

    if (!isSpeechOpenRef.current) {
      if (rms > effectiveThreshold) {
        isSpeechOpenRef.current = true;
        speechStartTimeRef.current = now;
        lastSpeechTimeRef.current = now;
        setState("speech_detected");
        callbacksRef.current?.onSpeechStart?.();
      }
      // Don't forward silent frames
      return;
    }

    // Speech is open
    if (rms > closeThreshold) {
      lastSpeechTimeRef.current = now;
    }

    // Check if speech has ended (silence > trailing_close_ms)
    const silenceDuration = now - lastSpeechTimeRef.current;
    const speechDuration = now - speechStartTimeRef.current;

    if (silenceDuration > config.trailingCloseMs && speechDuration > config.minimumOpenMs) {
      isSpeechOpenRef.current = false;
      setState("listening");
      callbacksRef.current?.onSpeechEnd?.();
      return;
    }

    // Forward audio frame (speech is active)
    callbacksRef.current?.onAudioFrame?.(int16Data);
  }, [config, calculateRms]);

  const cleanup = useCallback(() => {
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (scriptProcRef.current) {
      scriptProcRef.current.disconnect();
      scriptProcRef.current = null;
    }
    if (blobURLRef.current) {
      URL.revokeObjectURL(blobURLRef.current);
      blobURLRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current?.state !== "closed") {
      try { audioCtxRef.current?.close(); } catch {}
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    isSpeechOpenRef.current = false;
    calibrationSamplesRef.current = [];
    isCalibrating.current = false;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;

    try {
      setState("calibrating");
      isCalibrating.current = true;
      calibrationSamplesRef.current = [];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const source = audioCtxRef.current.createMediaStreamSource(stream);

      // Try AudioWorklet first
      try {
        const blobURL = createWorkletBlobURL();
        blobURLRef.current = blobURL;
        await audioCtxRef.current.audioWorklet.addModule(blobURL);
        const worklet = new AudioWorkletNode(audioCtxRef.current, "pcm-capture-processor");
        workletRef.current = worklet;

        worklet.port.onmessage = (event) => {
          if (event.data?.pcm?.length > 0) {
            processAudioFrame(event.data.pcm);
          }
        };

        source.connect(worklet);
        console.log("[AudioCapture] ✅ AudioWorklet pipeline active");
      } catch {
        // Fallback to ScriptProcessor
        const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
        scriptProcRef.current = processor;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const input = e.inputBuffer.getChannelData(0);
          if (input.length === 0) return;
          const int16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
          }
          processAudioFrame(int16);
        };

        source.connect(processor);
        processor.connect(audioCtxRef.current.destination);
        console.log("[AudioCapture] ⚠️ ScriptProcessor fallback active");
      }
    } catch (err) {
      console.error("[AudioCapture] Failed to start:", err);
      callbacksRef.current?.onError?.(err);
      cleanup();
    }
  }, [state, cleanup, processAudioFrame]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    start,
    stop,
    state,
    currentRms,
    isCalibrating: state === "calibrating",
    isSpeechDetected: state === "speech_detected",
  };
}
