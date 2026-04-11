/**
 * Voice Health Probe Engine
 * Tests mic, speaker, audio context before starting a voice session.
 */

export type ProbeStatus = 'healthy' | 'degraded' | 'broken' | 'unavailable';

export interface ProbeResult {
  mic: ProbeStatus;
  speaker: ProbeStatus;
  audioContext: ProbeStatus;
  overall: ProbeStatus;
  details: string[];
  durationMs: number;
}

/** Test if AudioContext can be created and resumed */
async function probeAudioContext(): Promise<{ status: ProbeStatus; detail: string }> {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const ok = ctx.state === 'running';
    await ctx.close();
    return ok
      ? { status: 'healthy', detail: 'AudioContext OK' }
      : { status: 'degraded', detail: `AudioContext state: ${ctx.state}` };
  } catch (e: any) {
    return { status: 'broken', detail: `AudioContext failed: ${e.message}` };
  }
}

/** Test if mic permission is granted and stream is active */
async function probeMicrophone(): Promise<{ status: ProbeStatus; detail: string }> {
  try {
    // Check permission state first
    if (navigator.permissions) {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (perm.state === 'denied') {
        return { status: 'unavailable', detail: 'Mic permission denied' };
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState !== 'live') {
      stream.getTracks().forEach(t => t.stop());
      return { status: 'broken', detail: 'Mic track not live' };
    }
    // Quick check: track is active
    const active = track.enabled && !track.muted;
    stream.getTracks().forEach(t => t.stop());
    return active
      ? { status: 'healthy', detail: 'Mic OK' }
      : { status: 'degraded', detail: 'Mic track muted or disabled' };
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      return { status: 'unavailable', detail: 'Mic permission not granted' };
    }
    return { status: 'broken', detail: `Mic error: ${e.message}` };
  }
}

/** Test if audio output works by playing a silent buffer */
async function probeSpeaker(): Promise<{ status: ProbeStatus; detail: string }> {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    
    // Create a very short silent buffer
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.01, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => {
        ctx.close().catch(() => {});
        resolve({ status: 'healthy', detail: 'Speaker OK' });
      };
      source.start();
      
      // Timeout fallback
      setTimeout(() => {
        ctx.close().catch(() => {});
        resolve({ status: 'degraded', detail: 'Speaker test timed out' });
      }, 500);
    });
  } catch (e: any) {
    return { status: 'broken', detail: `Speaker error: ${e.message}` };
  }
}

/** Run all probes and return combined result */
export async function runFullHealthProbe(): Promise<ProbeResult> {
  const start = Date.now();
  const details: string[] = [];

  // Run probes in parallel
  const [audioCtx, mic, speaker] = await Promise.all([
    probeAudioContext(),
    probeMicrophone(),
    probeSpeaker(),
  ]);

  details.push(audioCtx.detail, mic.detail, speaker.detail);

  // Compute overall
  const statuses = [audioCtx.status, mic.status, speaker.status];
  let overall: ProbeStatus = 'healthy';
  if (statuses.includes('broken') || statuses.includes('unavailable')) {
    overall = 'broken';
  } else if (statuses.includes('degraded')) {
    overall = 'degraded';
  }

  return {
    mic: mic.status,
    speaker: speaker.status,
    audioContext: audioCtx.status,
    overall,
    details,
    durationMs: Date.now() - start,
  };
}

/** Quick probe — just audio context and mic permission (no stream) */
export async function runQuickProbe(): Promise<{ canProceed: boolean; reason?: string }> {
  try {
    const ctx = new AudioContext();
    const ctxOk = ctx.state === 'running' || ctx.state === 'suspended';
    await ctx.close();
    if (!ctxOk) return { canProceed: false, reason: 'AudioContext unavailable' };
  } catch {
    return { canProceed: false, reason: 'AudioContext creation failed' };
  }

  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (perm.state === 'denied') {
        return { canProceed: false, reason: 'Microphone permission denied' };
      }
    } catch {
      // permissions API not available, proceed anyway
    }
  }

  return { canProceed: true };
}
