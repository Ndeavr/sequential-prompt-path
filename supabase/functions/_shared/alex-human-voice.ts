/**
 * Alex Human Voice Layer
 *
 * Shapes text and ElevenLabs voice settings for subtle emotional delivery.
 * NOT theatrical. NOT dramatic. Just alive.
 *
 * Integration: apply AFTER spoken rewrite + TTS normalize, BEFORE ElevenLabs call.
 */

// ─── Types ───

export type AlexSpeechMode = "homeowner" | "contractor" | "condo" | "urgency" | "booking" | "trust" | "neutral";

export interface SpeechStyleInput {
  mode: AlexSpeechMode;
  /** 0 = calm, 1 = very stressed */
  stressLevel?: number;
  /** 0 = no rush, 1 = emergency */
  urgencyLevel?: number;
  isReturningUser?: boolean;
}

export interface AlexSpeechStyle {
  /** ElevenLabs stability (0-1). Higher = more consistent/calm */
  stability: number;
  /** ElevenLabs similarity_boost (0-1). Voice identity strength */
  similarityBoost: number;
  /** ElevenLabs style (0-1). Lower = less theatrical */
  style: number;
  /** ElevenLabs speed (0.7-1.2) */
  speed: number;
  /** Internal label for logging */
  label: string;
}

// ─── Base Configs by Mode ───

const BASE_STYLES: Record<AlexSpeechMode, AlexSpeechStyle> = {
  neutral: {
    stability: 0.62,
    similarityBoost: 0.80,
    style: 0.08,
    speed: 0.95,
    label: "neutral",
  },
  homeowner: {
    stability: 0.60,
    similarityBoost: 0.80,
    style: 0.10,
    speed: 0.93,
    label: "homeowner-warm",
  },
  contractor: {
    stability: 0.65,
    similarityBoost: 0.82,
    style: 0.06,
    speed: 0.97,
    label: "contractor-sharp",
  },
  condo: {
    stability: 0.66,
    similarityBoost: 0.80,
    style: 0.05,
    speed: 0.94,
    label: "condo-structured",
  },
  urgency: {
    stability: 0.68,
    similarityBoost: 0.78,
    style: 0.04,
    speed: 0.98,
    label: "urgency-calm-fast",
  },
  booking: {
    stability: 0.63,
    similarityBoost: 0.80,
    style: 0.07,
    speed: 0.96,
    label: "booking-efficient",
  },
  trust: {
    stability: 0.66,
    similarityBoost: 0.82,
    style: 0.05,
    speed: 0.94,
    label: "trust-factual",
  },
};

// ─── Style Builder ───

/**
 * Compute ElevenLabs voice settings based on context.
 *
 * Adjustments are subtle — max ±0.05 per axis — to stay natural.
 *
 * QA examples:
 *   neutral, no stress → stability 0.62, speed 0.95 (baseline)
 *   homeowner, stress 0.8 → stability +0.04 (calmer), speed -0.02 (slower)
 *   contractor, urgency 0.9 → speed +0.03 (more direct), style -0.02
 *   condo, returning → stability +0.02 (familiar comfort)
 *   urgency, stress 1.0 → stability +0.05 (max calm), speed +0.02
 */
export function prepareAlexSpeechStyle(input: SpeechStyleInput): AlexSpeechStyle {
  const base = { ...(BASE_STYLES[input.mode] ?? BASE_STYLES.neutral) };
  const stress = clamp01(input.stressLevel ?? 0);
  const urgency = clamp01(input.urgencyLevel ?? 0);

  // High stress → more stable (calmer), slightly slower
  if (stress > 0.4) {
    const factor = (stress - 0.4) / 0.6; // 0-1 within stress range
    base.stability = clamp01(base.stability + factor * 0.05);
    base.speed = clampSpeed(base.speed - factor * 0.03);
    base.style = clamp01(base.style - factor * 0.03); // less expressive
  }

  // High urgency → slightly faster, more direct
  if (urgency > 0.4) {
    const factor = (urgency - 0.4) / 0.6;
    base.speed = clampSpeed(base.speed + factor * 0.04);
    base.style = clamp01(base.style - factor * 0.02);
  }

  // Returning user → tiny warmth bump
  if (input.isReturningUser) {
    base.stability = clamp01(base.stability + 0.02);
    base.style = clamp01(base.style + 0.02);
  }

  // Round for clean logs
  base.stability = round3(base.stability);
  base.similarityBoost = round3(base.similarityBoost);
  base.style = round3(base.style);
  base.speed = round3(base.speed);

  return base;
}

// ─── Text Shaping ───

/**
 * Apply subtle pacing markers to text for more human TTS delivery.
 * Inserts micro-pauses (commas, ellipses) at natural breath points.
 * Does NOT change meaning or wording.
 *
 * QA examples:
 *   "C'est courant on voit ça souvent" (no comma)
 *     → "C'est courant, on voit ça souvent."
 *   "OK on s'en occupe maintenant tu peux respirer"
 *     → "OK, on s'en occupe maintenant... tu peux respirer."
 */
export function shapeTextForHumanSpeech(text: string, style: AlexSpeechStyle): string {
  let result = text;

  // Add comma after short openers (natural breath point)
  // Exclude "Bon " when followed by après-midi/soir/jour to avoid "Bon, après-midi"
  result = result.replace(
    /^(OK|D'accord|Bon|Compris|Je vois|C'est noté|Parfait)\s+(?!après-midi|soir|jour)/i,
    "$1, "
  );

  // Add micro-pause before reassurance after a factual statement
  // "C'est courant on voit ça" → "C'est courant, on voit ça"
  result = result.replace(
    /(\b(?:courant|normal|faisable|réparable|correct))\s+(on|c'est|tu|je)/gi,
    "$1, $2"
  );

  // For calmer styles (high stability), add a gentle pause before questions
  if (style.stability > 0.64) {
    result = result.replace(
      /\.\s+(Tu veux|C'est quoi|On peut|Je peux)/g,
      "... $1"
    );
  }

  // Ensure no double commas or weird punctuation
  result = result.replace(/,\s*,/g, ",");
  result = result.replace(/\.\.\.\s*\.\.\./g, "...");
  result = result.replace(/\s{2,}/g, " ");

  return result.trim();
}

// ─── Utilities ───

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampSpeed(v: number): number {
  return Math.max(0.7, Math.min(1.2, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
