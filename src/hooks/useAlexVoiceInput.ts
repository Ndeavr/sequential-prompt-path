/**
 * useAlexVoiceInput — Manages microphone input via Web Speech API.
 * Falls back gracefully when speech recognition unavailable.
 */
import { useState, useCallback, useRef, useEffect } from "react";

interface UseAlexVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSilence?: () => void;
  silenceTimeoutMs?: number;
}

export function useAlexVoiceInput(options: UseAlexVoiceInputOptions = {}) {
  const { language = "fr-CA", onTranscript, onSilence, silenceTimeoutMs = 2000 } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      if (final) {
        setLiveTranscript("");
        onTranscript?.(final.trim(), true);
      } else {
        setLiveTranscript(interim);
        onTranscript?.(interim, false);
      }

      // Reset silence timer
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        onSilence?.();
      }, silenceTimeoutMs);
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") setPermissionDenied(true);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(silenceTimerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, onTranscript, onSilence, silenceTimeoutMs]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setLiveTranscript("");
    clearTimeout(silenceTimerRef.current);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    liveTranscript,
    permissionDenied,
    startListening,
    stopListening,
    toggleListening,
  };
}
