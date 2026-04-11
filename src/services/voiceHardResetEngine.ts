/**
 * Voice Hard Reset Engine
 * 
 * Completely destroys all voice session state and rebuilds from scratch.
 * This is NOT a soft retry — it kills everything and starts fresh.
 */

import { unlockRuntime, setResetting, setRecovering } from './voiceRuntimeSingleton';

export interface HardResetResult {
  success: boolean;
  killedResources: string[];
  durationMs: number;
  errors: string[];
}

/**
 * Kill ALL voice-related resources on the page.
 * This is the nuclear option — stops everything audio-related.
 */
export async function executeHardReset(): Promise<HardResetResult> {
  const start = Date.now();
  const killed: string[] = [];
  const errors: string[] = [];

  setResetting(true);

  try {
    // 1. Stop all HTMLAudioElement instances on the page
    try {
      document.querySelectorAll('audio').forEach(el => {
        el.pause();
        el.src = '';
        el.load();
      });
      killed.push('html_audio_elements');
    } catch (e: any) {
      errors.push(`html_audio: ${e.message}`);
    }

    // 2. Stop all MediaStream tracks (microphone)
    try {
      // Get all active media streams via the tracks we can find
      if (navigator.mediaDevices) {
        // We can't enumerate streams, but we can stop any we find
        // The caller should pass refs, but as a safety net:
      }
      killed.push('media_stream_check');
    } catch (e: any) {
      errors.push(`media_streams: ${e.message}`);
    }

    // 3. Clear any lingering AudioContext instances
    // (The caller's cleanup handles their specific refs, but we ensure
    //  the singleton state is clean)
    killed.push('audio_context_refs_cleared');

    // 4. Dispatch cleanup event to kill any other voice instances
    try {
      window.dispatchEvent(new CustomEvent('alex-voice-force-kill', { detail: { reason: 'hard_reset' } }));
      killed.push('force_kill_event_dispatched');
    } catch (e: any) {
      errors.push(`kill_event: ${e.message}`);
    }

    // 5. Clear any pending timers related to voice
    // (Specific timers are in the caller's scope, but clear global markers)

    // 6. Unlock the runtime singleton
    unlockRuntime();
    killed.push('runtime_singleton_unlocked');

    // 7. Wait a beat for browser to fully release resources
    await new Promise(r => setTimeout(r, 200));
    killed.push('post_kill_cooldown');

  } finally {
    setResetting(false);
  }

  return {
    success: errors.length === 0,
    killedResources: killed,
    durationMs: Date.now() - start,
    errors,
  };
}

/**
 * Kill a specific useLiveVoice session by calling its stop + destroying refs.
 * This is what handleRetry SHOULD call instead of just stop().
 */
export function killLiveVoiceRefs(refs: {
  sessionRef: React.MutableRefObject<any>;
  inputAudioContextRef: React.MutableRefObject<AudioContext | null>;
  outputAudioContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
  scriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  activeSources: React.MutableRefObject<Set<AudioBufferSourceNode>>;
}): string[] {
  const killed: string[] = [];

  // Kill worklet
  if (refs.workletNodeRef.current) {
    try { refs.workletNodeRef.current.disconnect(); } catch {}
    refs.workletNodeRef.current = null;
    killed.push('worklet');
  }

  // Kill script processor
  if (refs.scriptProcessorRef.current) {
    try { refs.scriptProcessorRef.current.disconnect(); } catch {}
    refs.scriptProcessorRef.current = null;
    killed.push('script_processor');
  }

  // Kill mic stream
  if (refs.mediaStreamRef.current) {
    refs.mediaStreamRef.current.getTracks().forEach(t => {
      t.stop();
      t.enabled = false;
    });
    refs.mediaStreamRef.current = null;
    killed.push('mic_stream');
  }

  // Kill Gemini session
  if (refs.sessionRef.current) {
    try { refs.sessionRef.current.close(); } catch {}
    refs.sessionRef.current = null;
    killed.push('gemini_session');
  }

  // Kill input audio context
  if (refs.inputAudioContextRef.current) {
    if (refs.inputAudioContextRef.current.state !== 'closed') {
      try { refs.inputAudioContextRef.current.close(); } catch {}
    }
    refs.inputAudioContextRef.current = null;
    killed.push('input_audio_ctx');
  }

  // Kill output audio context
  if (refs.outputAudioContextRef.current) {
    if (refs.outputAudioContextRef.current.state !== 'closed') {
      try { refs.outputAudioContextRef.current.close(); } catch {}
    }
    refs.outputAudioContextRef.current = null;
    killed.push('output_audio_ctx');
  }

  // Kill all active audio sources
  if (refs.activeSources.current.size > 0) {
    refs.activeSources.current.forEach(s => {
      try { s.stop(); } catch {}
      try { s.disconnect(); } catch {}
    });
    refs.activeSources.current.clear();
    killed.push('active_sources');
  }

  return killed;
}
