/**
 * useAlexVoiceOrchestrator
 * Multi-provider voice orchestration hook for Alex.
 * Manages provider selection, fallback chain, barge-in, quality monitoring.
 * Works alongside the existing useAlexVoiceSession for backward compatibility.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type VoiceSessionState,
  type VoiceSessionEvents,
  HybridVoiceProvider,
  TextOnlyVoiceProvider,
} from '@/services/alexVoiceAbstraction';
import {
  selectVoiceProvider,
  detectDeviceCapabilities,
  detectNetworkInfo,
  getNextFallback,
  type VoiceSelectionContext,
} from '@/services/alexVoiceRouterService';
import {
  type VoiceProviderKey,
  type VoiceProfileKey,
} from '@/services/alexVoiceProviderRegistry';
import { AlexVoiceQualityMonitor } from '@/services/alexVoiceQualityMonitor';

export interface UseAlexVoiceOrchestratorReturn {
  voiceState: VoiceSessionState;
  currentProvider: VoiceProviderKey;
  connectionMode: string;
  qualityLevel: 'excellent' | 'good' | 'degraded' | 'poor';
  isVoiceAvailable: boolean;
  transcript: string;
  alexResponse: string;
  startVoice: (alexSessionId: string, role: VoiceProfileKey) => Promise<void>;
  stopVoice: () => Promise<void>;
  sendText: (text: string) => Promise<void>;
  interruptAlex: () => void;
  switchToText: () => void;
}

export function useAlexVoiceOrchestrator(): UseAlexVoiceOrchestratorReturn {
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('idle');
  const [currentProvider, setCurrentProvider] = useState<VoiceProviderKey>('text_only');
  const [connectionMode, setConnectionMode] = useState('text_only');
  const [qualityLevel, setQualityLevel] = useState<'excellent' | 'good' | 'degraded' | 'poor'>('good');
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [alexResponse, setAlexResponse] = useState('');

  const providerRef = useRef<HybridVoiceProvider | TextOnlyVoiceProvider | null>(null);
  const qualityMonitor = useRef(new AlexVoiceQualityMonitor());
  const failedProviders = useRef<VoiceProviderKey[]>([]);
  const voiceSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    detectDeviceCapabilities().then(caps => {
      setIsVoiceAvailable(caps.hasMicrophone && caps.permissionMicrophone !== 'denied');
    });
  }, []);

  const events: VoiceSessionEvents = {
    onStateChange: setVoiceState,
    onTranscript: (text, _isFinal) => setTranscript(text),
    onAlexResponse: (text) => setAlexResponse(prev => prev + text),
    onAudioOutput: () => {},
    onError: (error) => {
      console.error('[AlexVoice]', error);
      qualityMonitor.current.recordError();
      if (!error.recoverable || qualityMonitor.current.shouldFallback()) {
        handleFallback();
      }
    },
    onBargeIn: () => setAlexResponse(''),
    onLatencyReport: (ms) => {
      qualityMonitor.current.recordLatency(ms);
      setQualityLevel(qualityMonitor.current.getQualityLevel());
    },
  };

  const handleFallback = useCallback(async () => {
    const next = getNextFallback(currentProvider, failedProviders.current);
    failedProviders.current.push(currentProvider);

    if (voiceSessionIdRef.current) {
      await supabase.from('alex_voice_fallback_events' as any).insert({
        voice_session_id: voiceSessionIdRef.current,
        from_provider: currentProvider,
        to_provider: next,
        reason: 'quality_or_error',
        was_user_visible: true,
      });
    }

    setCurrentProvider(next);
    setConnectionMode(next === 'text_only' ? 'text_only' : 'hybrid');

    await providerRef.current?.closeSession();
    const newProvider = next === 'text_only' ? new TextOnlyVoiceProvider() : new HybridVoiceProvider();
    providerRef.current = newProvider;
    await newProvider.startSession({
      sessionId: voiceSessionIdRef.current ?? '',
      language: 'fr', localeCode: 'fr-QC', voiceName: null, speechRate: 1.0, systemPrompt: '',
    }, events);
  }, [currentProvider, events]);

  const startVoice = useCallback(async (alexSessionId: string, role: VoiceProfileKey) => {
    const device = await detectDeviceCapabilities();
    const network = detectNetworkInfo();
    const ctx: VoiceSelectionContext = {
      role, language: 'fr', device, network,
      browserName: navigator.userAgent, flowType: 'conversation',
      previousFailedProviders: failedProviders.current,
    };
    const selection = selectVoiceProvider(ctx);
    setCurrentProvider(selection.provider);
    setConnectionMode(selection.connectionMode);

    // Create DB session
    try {
      const { data } = await supabase.from('alex_voice_sessions' as any).insert({
        session_id: alexSessionId,
        provider_primary: selection.provider,
        provider_current: selection.provider,
        provider_fallback: selection.fallback,
        connection_mode: selection.connectionMode,
        voice_profile_key: role,
        session_status: 'active',
      }).select('id').single();
      if (data) {
        voiceSessionIdRef.current = (data as any).id;
        qualityMonitor.current.setVoiceSessionId((data as any).id);
      }
    } catch { /* non-blocking */ }

    const provider = selection.connectionMode === 'text_only'
      ? new TextOnlyVoiceProvider()
      : new HybridVoiceProvider();
    providerRef.current = provider;
    await provider.startSession({
      sessionId: alexSessionId, language: 'fr', localeCode: 'fr-QC',
      voiceName: selection.voiceProfile.voiceNamePrimary, speechRate: selection.voiceProfile.speechRate,
      systemPrompt: '',
    }, events);

    if (provider instanceof HybridVoiceProvider && device.hasMicrophone && device.permissionMicrophone !== 'denied') {
      provider.startListening();
    }
  }, [events]);

  const stopVoice = useCallback(async () => {
    await providerRef.current?.closeSession();
    setVoiceState('closed');
    if (voiceSessionIdRef.current) {
      await supabase.from('alex_voice_sessions' as any).update({
        session_status: 'ended', ended_at: new Date().toISOString(),
      }).eq('id', voiceSessionIdRef.current);
    }
  }, []);

  const sendText = useCallback(async (text: string) => {
    await providerRef.current?.sendTextTurn(text);
  }, []);

  const interruptAlex = useCallback(() => {
    providerRef.current?.interruptSpeech();
    qualityMonitor.current.recordInterruption(true);
  }, []);

  const switchToText = useCallback(async () => {
    await providerRef.current?.closeSession();
    const textProvider = new TextOnlyVoiceProvider();
    providerRef.current = textProvider;
    setCurrentProvider('text_only');
    setConnectionMode('text_only');
    await textProvider.startSession({
      sessionId: '', language: 'fr', localeCode: 'fr-QC', voiceName: null, speechRate: 1.0, systemPrompt: '',
    }, events);
  }, [events]);

  return {
    voiceState, currentProvider, connectionMode, qualityLevel, isVoiceAvailable,
    transcript, alexResponse, startVoice, stopVoice, sendText, interruptAlex, switchToText,
  };
}
