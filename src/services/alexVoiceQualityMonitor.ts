/**
 * AlexVoiceQualityMonitor
 * Tracks voice session quality metrics and triggers fallback when needed.
 */

import { supabase } from '@/integrations/supabase/client';

export interface QualityMetrics {
  roundTripLatencyMs: number;
  audioStartDelayMs: number;
  interruptionCount: number;
  failedInterruptions: number;
  transcriptLossCount: number;
  bufferUnderruns: number;
  reconnectionCount: number;
  silenceGapsOver1s: number;
}

export interface QualityThresholds {
  maxLatencyMs: number;
  maxAudioStartDelayMs: number;
  maxConsecutiveErrors: number;
  maxSilenceGapMs: number;
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  maxLatencyMs: 2000,
  maxAudioStartDelayMs: 1000,
  maxConsecutiveErrors: 3,
  maxSilenceGapMs: 1000,
};

export class AlexVoiceQualityMonitor {
  private metrics: QualityMetrics = {
    roundTripLatencyMs: 0,
    audioStartDelayMs: 0,
    interruptionCount: 0,
    failedInterruptions: 0,
    transcriptLossCount: 0,
    bufferUnderruns: 0,
    reconnectionCount: 0,
    silenceGapsOver1s: 0,
  };

  private consecutiveErrors = 0;
  private voiceSessionId: string | null = null;
  private thresholds: QualityThresholds;

  constructor(thresholds?: Partial<QualityThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  setVoiceSessionId(id: string) {
    this.voiceSessionId = id;
  }

  recordLatency(ms: number) {
    this.metrics.roundTripLatencyMs = ms;
    if (ms > this.thresholds.maxLatencyMs) {
      this.consecutiveErrors++;
    } else {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
    }
    this.logMetric('round_trip_latency', ms);
  }

  recordAudioStartDelay(ms: number) {
    this.metrics.audioStartDelayMs = ms;
    this.logMetric('audio_start_delay', ms);
  }

  recordInterruption(success: boolean) {
    this.metrics.interruptionCount++;
    if (!success) this.metrics.failedInterruptions++;
    this.logMetric('interruption', success ? 1 : 0);
  }

  recordError() {
    this.consecutiveErrors++;
    this.logMetric('error', this.consecutiveErrors);
  }

  recordSilenceGap(ms: number) {
    if (ms > 1000) this.metrics.silenceGapsOver1s++;
    this.logMetric('silence_gap', ms);
  }

  shouldFallback(): boolean {
    return this.consecutiveErrors >= this.thresholds.maxConsecutiveErrors;
  }

  shouldReduceQuality(): boolean {
    return this.metrics.roundTripLatencyMs > this.thresholds.maxLatencyMs * 0.7;
  }

  getQualityLevel(): 'excellent' | 'good' | 'degraded' | 'poor' {
    const lat = this.metrics.roundTripLatencyMs;
    if (lat < 500 && this.consecutiveErrors === 0) return 'excellent';
    if (lat < 1000 && this.consecutiveErrors < 2) return 'good';
    if (lat < 2000) return 'degraded';
    return 'poor';
  }

  getMetrics(): QualityMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      roundTripLatencyMs: 0,
      audioStartDelayMs: 0,
      interruptionCount: 0,
      failedInterruptions: 0,
      transcriptLossCount: 0,
      bufferUnderruns: 0,
      reconnectionCount: 0,
      silenceGapsOver1s: 0,
    };
    this.consecutiveErrors = 0;
  }

  private async logMetric(key: string, value: number) {
    if (!this.voiceSessionId) return;
    try {
      await supabase.from('alex_voice_quality_logs').insert({
        voice_session_id: this.voiceSessionId,
        metric_key: key,
        metric_value: value,
        quality_level: this.getQualityLevel(),
      } as any);
    } catch {
      // non-blocking
    }
  }
}
