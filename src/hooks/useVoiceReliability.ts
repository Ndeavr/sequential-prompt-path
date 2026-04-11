/**
 * useVoiceReliability — Client-side hook for the Voice Reliability Engine.
 * 
 * Manages: session lifecycle, silence detection, STT/TTS calls, 
 * error handling, fallback, and event logging.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type VoiceReliabilityState =
  | "idle"
  | "requesting_mic"
  | "listening"
  | "hearing_user"
  | "silence_countdown"
  | "processing"
  | "alex_speaking"
  | "error"
  | "fallback_text"
  | "session_closed";

interface VoiceReliabilityOptions {
  silenceTimeoutMs?: number;
  entryPoint?: string;
  onTranscript?: (text: string) => void;
  onAlexResponse?: (text: string) => void;
  onError?: (error: { code: string; message: string }) => void;
  onFallbackActivated?: () => void;
}

const RMS_THRESHOLD = 15;
const CJK_REGEX = /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]/;

export function useVoiceReliability(options: VoiceReliabilityOptions = {}) {
  const {
    silenceTimeoutMs = 3000,
    entryPoint = "unknown",
    onTranscript,
    onAlexResponse,
    onError,
    onFallbackActivated,
  } = options;

  const { user } = useAuth();
  const [state, setState] = useState<VoiceReliabilityState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rmsCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionMutexRef = useRef(false);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (rmsCheckIntervalRef.current) clearInterval(rmsCheckIntervalRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    if (audioContextRef.current?.state !== "closed") {
      try { audioContextRef.current?.close(); } catch {}
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  // Create session in DB
  const createSession = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from("voice_reliability_sessions")
        .insert({
          user_id: user.id,
          entry_point: entryPoint,
          silence_timeout_ms: silenceTimeoutMs,
          device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          browser_name: navigator.userAgent.split("/")[0],
          locale: "fr-CA",
          active_stt_provider: "google_cloud_stt",
          active_tts_provider: "elevenlabs_primary",
        })
        .select("id")
        .single();
      if (error) throw error;
      return (data as any)?.id || null;
    } catch (e) {
      console.error("[VoiceReliability] Failed to create session:", e);
      return null;
    }
  }, [user?.id, entryPoint, silenceTimeoutMs]);

  const logEvent = useCallback(async (eventType: string, payload?: Record<string, unknown>) => {
    if (!sessionId) return;
    try {
      await supabase.from("voice_reliability_events").insert({
        voice_session_id: sessionId,
        event_type: eventType,
        event_source: "client",
        payload_json: payload || {},
      });
    } catch {}
  }, [sessionId]);

  // Start recording
  const startListening = useCallback(async () => {
    if (sessionMutexRef.current) return;
    sessionMutexRef.current = true;

    cleanup();
    setState("requesting_mic");
    setLastError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);

      // Create session
      const sid = await createSession();
      if (sid) setSessionId(sid);

      // Setup analyser for RMS/silence detection
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) {
          setState("listening");
          return;
        }
        setState("processing");
        await processAudio(blob, sid);
      };

      recorder.start(250); // collect in 250ms chunks
      setState("listening");

      if (sid) await logEvent("recording_started");

      // RMS monitoring for silence detection
      const dataArray = new Uint8Array(analyser.fftSize);
      let lastSoundAt = Date.now();

      rmsCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length) * 100;

        if (rms > RMS_THRESHOLD) {
          lastSoundAt = Date.now();
          setState("hearing_user");
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (Date.now() - lastSoundAt > 1000) {
          setState("silence_countdown");
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              // 3s silence → stop
              if (rmsCheckIntervalRef.current) clearInterval(rmsCheckIntervalRef.current);
              if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop();
              }
              if (sid) logEvent("silence_detected", { timeout_ms: silenceTimeoutMs });
            }, silenceTimeoutMs - 1000);
          }
        }
      }, 100);

    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setPermissionDenied(true);
        setState("error");
        setLastError({ code: "mic_denied", message: "Accès au microphone refusé" });
        onError?.({ code: "mic_denied", message: "Accès au microphone refusé" });
      } else {
        setState("error");
        setLastError({ code: "mic_error", message: err?.message || "Erreur micro" });
        onError?.({ code: "mic_error", message: err?.message || "Erreur micro" });
      }
    } finally {
      sessionMutexRef.current = false;
    }
  }, [cleanup, createSession, silenceTimeoutMs, onError, logEvent]);

  // Process recorded audio
  const processAudio = useCallback(async (blob: Blob, sid: string | null) => {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const audioBase64 = await base64Promise;

      // Call STT
      const { data: sttData, error: sttError } = await supabase.functions.invoke("alex-stt", {
        body: { audio_base64: audioBase64, locale: "fr-CA", voice_session_id: sid },
      });

      if (sttError || !sttData?.success) {
        const reason = sttData?.rejected_reason || sttData?.error_code || "stt_failed";
        console.warn("[VoiceReliability] STT failed:", reason);
        
        if (sttData?.rejected && sttData?.rejected_reason === "cjk_characters_detected") {
          // Silently restart listening — don't show CJK to user
          setState("listening");
          return;
        }

        setState("error");
        setLastError({ code: reason, message: "Transcription échouée. Réessayez." });
        onError?.({ code: reason, message: "Transcription échouée" });
        return;
      }

      const transcript = sttData.transcript;
      onTranscript?.(transcript);

      // Now get Alex response via existing alex-voice function
      setState("alex_speaking");

    } catch (e: any) {
      console.error("[VoiceReliability] Process error:", e);
      setState("error");
      setLastError({ code: "process_error", message: e?.message || "Erreur de traitement" });
      onError?.({ code: "process_error", message: e?.message || "Erreur" });
    }
  }, [onTranscript, onError]);

  // Play TTS audio
  const playTTS = useCallback(async (text: string) => {
    setState("alex_speaking");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice_session_id: sessionId }),
        }
      );

      const fallbackUsed = response.headers.get("X-Alex-Fallback-Used") === "true";

      if (!response.ok) {
        // TTS failed — show text fallback
        setFallbackActive(true);
        setState("fallback_text");
        onFallbackActivated?.();
        onAlexResponse?.(text);
        if (sessionId) await logEvent("tts_failed_text_fallback", { text_length: text.length });
        return;
      }

      if (fallbackUsed) {
        setFallbackActive(true);
        onFallbackActivated?.();
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        setState("listening");
        if (sessionId) logEvent("playback_ended");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setState("fallback_text");
        onAlexResponse?.(text);
      };

      await audio.play();
      if (sessionId) await logEvent("playback_started");
      onAlexResponse?.(text);

    } catch (e: any) {
      console.error("[VoiceReliability] TTS error:", e);
      setState("fallback_text");
      onAlexResponse?.(text);
    }
  }, [sessionId, onAlexResponse, onFallbackActivated, logEvent]);

  // Stop everything
  const stopListening = useCallback(() => {
    cleanup();
    if (sessionId) {
      logEvent("session_closed");
      supabase.from("voice_reliability_sessions")
        .update({ session_status: "completed", ended_at: new Date().toISOString(), ended_reason: "user_stop" })
        .eq("id", sessionId)
        .then(() => {});
    }
    setState("session_closed");
    sessionMutexRef.current = false;
  }, [cleanup, sessionId, logEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      sessionMutexRef.current = false;
    };
  }, [cleanup]);

  return {
    state,
    sessionId,
    fallbackActive,
    permissionDenied,
    lastError,
    startListening,
    stopListening,
    playTTS,
  };
}
