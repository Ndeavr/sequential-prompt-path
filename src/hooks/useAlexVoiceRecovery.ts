/**
 * useAlexVoiceRecovery — Hard reset + recovery hook for Alex Voice.
 * 
 * Provides a deterministic recovery flow:
 * 1. Kill everything (hard reset)
 * 2. Probe health (mic, speaker, audio)
 * 3. Rebuild session
 * 4. Test greeting
 * 5. Or fallback to chat
 */

import { useCallback, useRef, useState } from 'react';
import { executeHardReset } from '@/services/voiceHardResetEngine';
import { runFullHealthProbe, type ProbeResult } from '@/services/voiceHealthProbeEngine';
import { setRecovering, isResetting } from '@/services/voiceRuntimeSingleton';
import { useAlexVoiceLockedStore } from '@/stores/alexVoiceLockedStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type RecoveryPhase =
  | 'idle'
  | 'killing'
  | 'probing'
  | 'rebuilding'
  | 'greeting_test'
  | 'recovered'
  | 'failed_fallback_chat'
  | 'closed';

export interface RecoveryState {
  phase: RecoveryPhase;
  probeResult: ProbeResult | null;
  attemptCount: number;
  lastError: string | null;
  phaseLabel: string;
}

const PHASE_LABELS: Record<RecoveryPhase, string> = {
  idle: '',
  killing: 'Réinitialisation de la session…',
  probing: 'Vérification du micro et audio…',
  rebuilding: 'Reconnexion vocale…',
  greeting_test: 'Alex redémarre…',
  recovered: 'Alex est reconnectée',
  failed_fallback_chat: 'Mode chat activé',
  closed: '',
};

const MAX_RECOVERY_ATTEMPTS = 2;

export function useAlexVoiceRecovery() {
  const [state, setState] = useState<RecoveryState>({
    phase: 'idle',
    probeResult: null,
    attemptCount: 0,
    lastError: null,
    phaseLabel: '',
  });
  const attemptCountRef = useRef(0);
  const { user } = useAuth();

  const setPhase = useCallback((phase: RecoveryPhase, error?: string) => {
    setState(prev => ({
      ...prev,
      phase,
      phaseLabel: PHASE_LABELS[phase],
      lastError: error ?? prev.lastError,
    }));
  }, []);

  /**
   * Execute a full hard reset recovery.
   * @param stopFn — the useLiveVoice stop() function
   * @param startFn — the useLiveVoice start() function  
   * @param buildGreetingFn — function to build the greeting text
   * @param onRecovered — callback when recovery succeeds
   * @param onFallbackChat — callback when giving up and switching to chat
   */
  const executeRecovery = useCallback(async (
    stopFn: () => void,
    startFn: (opts: { initialGreeting: string }) => Promise<void>,
    buildGreetingFn: () => string,
    onRecovered?: () => void,
    onFallbackChat?: () => void,
  ) => {
    if (isResetting()) {
      console.warn('[VoiceRecovery] Already resetting, ignoring');
      return;
    }

    attemptCountRef.current++;
    const attemptNum = attemptCountRef.current;

    // If too many attempts, go straight to chat
    if (attemptNum > MAX_RECOVERY_ATTEMPTS) {
      console.warn('[VoiceRecovery] Max attempts reached, forcing chat fallback');
      setPhase('failed_fallback_chat', 'Trop de tentatives. Mode chat activé.');
      onFallbackChat?.();
      return;
    }

    setState(prev => ({ ...prev, attemptCount: attemptNum }));
    setRecovering(true);

    const recoveryStartMs = Date.now();
    const previousSessionId = useAlexVoiceLockedStore.getState().sessionId;

    // Log attempt to DB (non-blocking, best-effort).
    // NOTE: voice_recovery_attempts.user_id references profiles(id), not auth.users.id.
    // We pass null to avoid FK failures and rely on previous_session_id for joining.
    const recoveryId = crypto.randomUUID();
    supabase.from('voice_recovery_attempts' as any).insert({
      id: recoveryId,
      user_id: null,
      previous_session_id: previousSessionId,
      recovery_type: 'hard_reset',
      trigger_reason: `attempt_${attemptNum}`,
      result: 'pending',
    } as any).then(() => {});

    try {
      // ─── PHASE 1: KILL ───
      setPhase('killing');
      console.log('[VoiceRecovery] Phase 1: Killing all resources...');
      
      // Stop the hook's session
      try { stopFn(); } catch (e) { console.warn('[VoiceRecovery] stopFn error:', e); }
      
      // Execute global hard reset
      const resetResult = await executeHardReset();
      console.log('[VoiceRecovery] Kill complete:', resetResult);

      // Clear the store error state
      const store = useAlexVoiceLockedStore.getState();
      store.clearError();

      // Wait for browser to fully release resources
      await new Promise(r => setTimeout(r, 300));

      // ─── PHASE 2: PROBE ───
      setPhase('probing');
      console.log('[VoiceRecovery] Phase 2: Health probes...');
      
      const probe = await runFullHealthProbe();
      setState(prev => ({ ...prev, probeResult: probe }));
      console.log('[VoiceRecovery] Probe result:', probe);

      if (probe.overall === 'broken') {
        const reason = probe.details.filter(d => d.includes('denied') || d.includes('failed')).join('; ') 
          || 'Audio non disponible';
        setPhase('failed_fallback_chat', reason);
        
        supabase.from('voice_recovery_attempts' as any)
          .update({ result: 'fallback_chat', total_duration_ms: Date.now() - recoveryStartMs } as any)
          .eq('id', recoveryId).then(() => {});
        
        onFallbackChat?.();
        return;
      }

      // ─── PHASE 3: REBUILD ───
      setPhase('rebuilding');
      console.log('[VoiceRecovery] Phase 3: Rebuilding session...');

      // Reset store to fresh state for new session
      const freshStore = useAlexVoiceLockedStore.getState();
      // Transition to opening_session (allow from error states)
      if (freshStore.machineState === 'error_recoverable' || freshStore.machineState === 'error_fatal') {
        freshStore.transitionTo('opening_session', 'recovery_rebuild');
      }
      freshStore.transitionTo('stabilizing', 'recovery_stabilizing');

      // ─── PHASE 4: GREETING TEST ───
      setPhase('greeting_test');
      console.log('[VoiceRecovery] Phase 4: Starting greeting test...');

      const greeting = buildGreetingFn();
      await startFn({ initialGreeting: greeting });

      // If we get here without error, start was successful
      // The onFirstAudio callback in the overlay will handle the rest

      // ─── RECOVERED ───
      setPhase('recovered');
      console.log('[VoiceRecovery] ✅ Recovery successful');

      supabase.from('voice_recovery_attempts' as any)
        .update({ 
          result: 'success', 
          total_duration_ms: Date.now() - recoveryStartMs,
          new_session_id: useAlexVoiceLockedStore.getState().sessionId,
        } as any)
        .eq('id', recoveryId).then(() => {});

      onRecovered?.();

    } catch (err: any) {
      console.error('[VoiceRecovery] Recovery failed:', err);
      
      supabase.from('voice_recovery_attempts' as any)
        .update({ result: 'failed', total_duration_ms: Date.now() - recoveryStartMs } as any)
        .eq('id', recoveryId).then(() => {});

      // Log failure
      supabase.from('voice_audio_failures' as any).insert({
        recovery_attempt_id: recoveryId,
        session_id: previousSessionId,
        failure_type: 'recovery_failed',
        failure_stage: state.phase,
        error_message: err?.message ?? 'Unknown error',
      } as any).then(() => {});

      if (attemptNum >= MAX_RECOVERY_ATTEMPTS) {
        setPhase('failed_fallback_chat', 'La voix n\'est pas disponible. Mode chat activé.');
        onFallbackChat?.();
      } else {
        setPhase('failed_fallback_chat', err?.message ?? 'Échec de la reconnexion.');
        // Don't auto-retry — let user decide
      }
    } finally {
      setRecovering(false);
    }
  }, [user?.id, setPhase, state.phase]);

  const resetState = useCallback(() => {
    setState({
      phase: 'idle',
      probeResult: null,
      attemptCount: 0,
      lastError: null,
      phaseLabel: '',
    });
    attemptCountRef.current = 0;
  }, []);

  return {
    ...state,
    executeRecovery,
    resetState,
    isRecovering: state.phase !== 'idle' && state.phase !== 'recovered' && state.phase !== 'closed',
  };
}
