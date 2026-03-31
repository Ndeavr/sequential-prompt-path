/**
 * useAlexVoiceRuntime — Main hook for Alex voice interactions.
 * 
 * Uses AlexSingleAudioChannel for guaranteed single-voice output.
 * Loads voice config from DB via edge function (no hardcoded voice IDs).
 * Manages STT, interruption, and state.
 * 
 * PRIMARY: Gemini Live (Native Audio) via useLiveVoice hook.
 * FALLBACK: Legacy TTS pipeline via alex-voice-speak edge function.
 * RULE: Before any audio output, fires alex-voice-cleanup to kill all other voice sources.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { alexAudioChannel, type AudioState } from '@/services/alexSingleAudioChannel';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type VoiceRuntimeState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'error';

interface VoiceConfig {
  provider: string;
  voiceId: string;
  locale: string;
  toneStyle: string;
  speechRate: number;
  accentTarget: string;
  interruptibility: boolean;
  stability: number;
  similarityBoost: number;
  styleExaggeration: number;
}

interface UseAlexVoiceRuntimeOptions {
  profileKey?: string;
  language?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAlexResponse?: (text: string) => void;
  onStateChange?: (state: VoiceRuntimeState) => void;
}

export function useAlexVoiceRuntime(options: UseAlexVoiceRuntimeOptions = {}) {
  const { profileKey = 'homeowner', language = 'fr' } = options;

  const [runtimeState, setRuntimeState] = useState<VoiceRuntimeState>('idle');
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Track audio channel state
  useEffect(() => {
    const unsub = alexAudioChannel.onStateChange((s) => {
      if (!mountedRef.current) return;
      setAudioState(s);
      if (s === 'playing') setRuntimeState('speaking');
      else if (s === 'interrupted') setRuntimeState('interrupted');
      else if (s === 'idle' && runtimeState === 'speaking') setRuntimeState('idle');
    });
    return unsub;
  }, [runtimeState]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      alexAudioChannel.hardStop();
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  // Listen for global cleanup (e.g. another voice source starting)
  useEffect(() => {
    const handler = () => {
      alexAudioChannel.hardStop();
      try { recognitionRef.current?.stop(); } catch {}
      if (mountedRef.current) setRuntimeState('idle');
    };
    window.addEventListener('alex-voice-cleanup', handler);
    return () => window.removeEventListener('alex-voice-cleanup', handler);
  }, []);

  // Load voice config from DB
  const loadConfig = useCallback(async () => {
    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-voice-get-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ profile_key: profileKey, language }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (mountedRef.current) {
          setVoiceConfig(data);
          setConfigLoaded(true);
        }
        return data;
      }
    } catch (e) {
      console.error('[AlexVoiceRuntime] Config load failed:', e);
    }
    return null;
  }, [profileKey, language]);

  // Speak text via ElevenLabs (through alex-voice-speak edge function)
  const speak = useCallback(async (text: string) => {
    if (!mountedRef.current) return;

    // Kill ALL previous audio + other voice sources
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent('alex-voice-cleanup'));
    setRuntimeState('thinking');

    try {
      const config = voiceConfig || await loadConfig();
      
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-voice-speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          text,
          profile_key: profileKey,
          language,
          voice_id: config?.voiceId,
        }),
      });

      if (!resp.ok) {
        console.error('[AlexVoiceRuntime] TTS failed:', resp.status);
        // Log error server-side
        fetch(`${FUNCTIONS_BASE}/alex-voice-log-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ error_type: 'tts_request_failed', error_message: `Status ${resp.status}`, payload: { profileKey, language } }),
        }).catch(() => {});
        if (mountedRef.current) setRuntimeState('error');
        return;
      }

      const blob = await resp.blob();
      if (mountedRef.current) {
        await alexAudioChannel.playBlob(blob);
      }
    } catch (e) {
      console.error('[AlexVoiceRuntime] Speak error:', e);
      if (mountedRef.current) setRuntimeState('error');
    }
  }, [voiceConfig, loadConfig, profileKey, language]);

  // Interrupt Alex immediately
  const interrupt = useCallback(() => {
    alexAudioChannel.interrupt();
    try { recognitionRef.current?.stop(); } catch {}
    if (mountedRef.current) setRuntimeState('interrupted');
  }, []);

  // Start STT listening
  const startListening = useCallback(() => {
    // Kill any playing audio first
    if (alexAudioChannel.isPlaying()) {
      alexAudioChannel.interrupt();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[AlexVoiceRuntime] STT not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceConfig?.locale || (language === 'fr' ? 'fr-CA' : 'en-CA');
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      const isFinal = last.isFinal;
      
      // Interrupt Alex immediately on any user speech
      if (alexAudioChannel.isPlaying()) {
        alexAudioChannel.interrupt();
      }
      
      options.onTranscript?.(transcript, isFinal);
    };

    recognition.onerror = () => {
      if (mountedRef.current) setRuntimeState('idle');
    };

    recognition.onend = () => {
      if (mountedRef.current && runtimeState === 'listening') {
        setRuntimeState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRuntimeState('listening');
  }, [voiceConfig, language, options, runtimeState]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    if (mountedRef.current) setRuntimeState('idle');
  }, []);

  // Hard reset everything
  const hardReset = useCallback(() => {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent('alex-voice-cleanup'));
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    if (mountedRef.current) {
      setRuntimeState('idle');
    }
  }, []);

  return {
    runtimeState,
    audioState,
    voiceConfig,
    configLoaded,
    loadConfig,
    speak,
    interrupt,
    startListening,
    stopListening,
    hardReset,
    isPlaying: audioState === 'playing' || audioState === 'loading',
    isSpeaking: runtimeState === 'speaking',
    isListening: runtimeState === 'listening',
  };
}
