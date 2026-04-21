/**
 * Alex 100M — Noise Gate
 * Classifies STT events to filter background noise from valid input.
 */

import type { STTTranscriptEvent, NoiseGateResult } from "../types/alex.types";
import { alexLog } from "../utils/alexDebug";

const MIN_CONFIDENCE = 0.55;
const MIN_WORD_COUNT = 1;
const MIN_DURATION_MS = 300;
const NOISE_PATTERNS = /^(hm+|uh+|ah+|oh+|euh+|um+|mm+|hein|ok+|oui+|non+)$/i;

export function classifyTranscript(event: STTTranscriptEvent): NoiseGateResult {
  const { text, confidence, durationMs } = event;
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Too short in duration — likely noise
  if (durationMs < MIN_DURATION_MS) {
    alexLog("noiseGate:background_noise", { reason: "too_short", durationMs });
    return "background_noise";
  }

  // Empty or noise pattern
  if (!trimmed || NOISE_PATTERNS.test(trimmed)) {
    alexLog("noiseGate:background_noise", { reason: "noise_pattern", trimmed });
    return "background_noise";
  }

  // Low confidence
  if (confidence < MIN_CONFIDENCE) {
    alexLog("noiseGate:low_confidence", { confidence, trimmed });
    return "low_confidence";
  }

  // Too few words with medium confidence
  if (wordCount < MIN_WORD_COUNT && confidence < 0.75) {
    alexLog("noiseGate:low_confidence", { reason: "few_words", wordCount });
    return "low_confidence";
  }

  alexLog("noiseGate:valid_input", { trimmed, confidence });
  return "valid_input";
}
