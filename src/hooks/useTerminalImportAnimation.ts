/**
 * useTerminalImportAnimation — Orchestrates the green terminal animation
 * driven by real import data with controlled delays.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export type TerminalLineType =
  | "boot" | "lookup" | "fetch" | "parse" | "normalize"
  | "verify" | "analyze" | "score" | "predict" | "recommend"
  | "success" | "warning" | "error";

export type TerminalLineSeverity = "info" | "success" | "warning" | "error";

export interface TerminalLine {
  id: string;
  text: string;
  type: TerminalLineType;
  severity: TerminalLineSeverity;
  stage: string;
  revealCard?: string;
  typedChars: number;
  totalChars: number;
  visible: boolean;
  timestamp: number;
}

export interface AnimationPreset {
  code: string;
  delayBeforeLineMs: number;
  typingSpeedCharsPerSec: number;
  holdAfterLineMs: number;
  stageTransitionMs: number;
  revealCardDelayMs: number;
  revealScoreDelayMs: number;
  revealPlanDelayMs: number;
}

export type AnimationStage =
  | "idle" | "booting" | "identity" | "photos" | "reputation"
  | "verification" | "aipp_score" | "plan_recommendation" | "completed";

export interface ImportData {
  businessName?: string;
  category?: string;
  phone?: string;
  city?: string;
  website?: string;
  logoUrl?: string;
  photoCount?: number;
  photoTags?: string[];
  reviewCount?: number;
  averageRating?: number;
  reviewThemes?: string[];
  rbqStatus?: string;
  neqStatus?: string;
  aippScore?: number;
  aippDimensions?: Record<string, number>;
  recommendedPlan?: string;
  planReason?: string;
}

const PRESETS: Record<string, AnimationPreset> = {
  cinematic_slow: { code: "cinematic_slow", delayBeforeLineMs: 500, typingSpeedCharsPerSec: 28, holdAfterLineMs: 400, stageTransitionMs: 1200, revealCardDelayMs: 900, revealScoreDelayMs: 1800, revealPlanDelayMs: 2200 },
  balanced_default: { code: "balanced_default", delayBeforeLineMs: 300, typingSpeedCharsPerSec: 40, holdAfterLineMs: 200, stageTransitionMs: 800, revealCardDelayMs: 600, revealScoreDelayMs: 1200, revealPlanDelayMs: 1500 },
  fast_demo: { code: "fast_demo", delayBeforeLineMs: 100, typingSpeedCharsPerSec: 80, holdAfterLineMs: 80, stageTransitionMs: 300, revealCardDelayMs: 200, revealScoreDelayMs: 400, revealPlanDelayMs: 500 },
};

function buildTerminalSequence(data: ImportData): Omit<TerminalLine, "typedChars" | "visible" | "timestamp">[] {
  const biz = data.businessName || "Entreprise";
  const lines: Omit<TerminalLine, "typedChars" | "visible" | "timestamp">[] = [];
  let seq = 0;
  const add = (text: string, type: TerminalLineType, severity: TerminalLineSeverity, stage: string, revealCard?: string) => {
    lines.push({ id: `line-${seq++}`, text, type, severity, stage, revealCard, totalChars: text.length });
  };

  // Boot
  add("initializing import runtime...", "boot", "info", "booting");
  add("loading contractor intelligence graph", "boot", "info", "booting");
  add("starting source connectors", "boot", "info", "booting");
  add("awaiting public business signals", "boot", "info", "booting");
  add("secure sync established", "boot", "success", "booting");
  add("import pipeline ready", "boot", "success", "booting");

  // Identity
  add(`business entity search: "${biz}"`, "lookup", "info", "identity");
  if (data.category) add(`primary category: ${data.category}`, "parse", "info", "identity");
  if (data.phone) add(`phone detected: ${data.phone}`, "parse", "info", "identity");
  if (data.city) add(`city matched: ${data.city}`, "parse", "info", "identity");
  if (data.website) add(`website found: ${data.website}`, "fetch", "info", "identity");
  if (data.logoUrl) add("logo detected ✓", "parse", "success", "identity", "logo");
  add("business entity matched ✓", "success", "success", "identity", "identity_card");

  // Photos
  if (data.photoCount && data.photoCount > 0) {
    add(`scanning visual assets...`, "fetch", "info", "photos");
    add(`photos imported: ${data.photoCount}`, "parse", "info", "photos", "gallery");
    if (data.photoTags?.length) {
      add(`tags: ${data.photoTags.join(", ")}`, "analyze", "info", "photos");
    }
    add("visual analysis complete ✓", "success", "success", "photos");
  }

  // Reputation
  if (data.reviewCount !== undefined) {
    add("fetching review signals...", "fetch", "info", "reputation");
    add(`reviews normalized: ${data.reviewCount}`, "normalize", "info", "reputation");
    if (data.averageRating) add(`average rating computed: ${data.averageRating}`, "analyze", "info", "reputation");
    const density = data.reviewCount > 50 ? "high" : data.reviewCount > 15 ? "moderate" : "low";
    add(`trust signal density: ${density}`, "analyze", "info", "reputation");
    if (data.reviewThemes?.length) {
      add(`dominant themes: ${data.reviewThemes.join(", ")}`, "analyze", "info", "reputation");
    }
    add("reputation analysis complete ✓", "success", "success", "reputation", "reviews_card");
  }

  // Verification
  add("running verification checks...", "verify", "info", "verification");
  if (data.rbqStatus) {
    const sev: TerminalLineSeverity = data.rbqStatus === "valid" ? "success" : data.rbqStatus === "not_found" ? "warning" : "info";
    add(`RBQ status: ${data.rbqStatus}`, "verify", sev, "verification");
  }
  if (data.neqStatus) {
    const sev: TerminalLineSeverity = data.neqStatus === "valid" ? "success" : "warning";
    add(`NEQ status: ${data.neqStatus}`, "verify", sev, "verification");
  }
  add("website integrity: checked", "verify", "info", "verification");
  add("profile consistency: analyzed", "verify", "info", "verification");
  add("verification complete ✓", "success", "success", "verification", "verification_card");

  // AIPP Score
  add("aggregating AIPP dimensions...", "score", "info", "aipp_score");
  if (data.aippDimensions) {
    for (const [dim, val] of Object.entries(data.aippDimensions)) {
      add(`${dim}: ${val}/100`, "score", "info", "aipp_score");
    }
  }
  if (data.aippScore !== undefined) {
    add(`AIPP score calculated: ${data.aippScore}/100`, "score", "success", "aipp_score", "aipp_score_card");
  } else {
    add("AIPP score: computing...", "score", "info", "aipp_score");
  }

  // Plan recommendation
  add("evaluating plan fit...", "predict", "info", "plan_recommendation");
  if (data.recommendedPlan) {
    add(`recommended plan: ${data.recommendedPlan}`, "recommend", "success", "plan_recommendation", "plan_card");
    if (data.planReason) add(`reason: ${data.planReason}`, "recommend", "info", "plan_recommendation");
  }
  add("import sequence complete ✓", "success", "success", "completed");

  return lines;
}

export function useTerminalImportAnimation(
  importData: ImportData,
  presetCode: string = "balanced_default",
  autoStart: boolean = true
) {
  const preset = PRESETS[presetCode] || PRESETS.balanced_default;
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentStage, setCurrentStage] = useState<AnimationStage>("idle");
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [alexMessages, setAlexMessages] = useState<string[]>([]);
  const abortRef = useRef(false);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const sequence = useMemo(() => buildTerminalSequence(importData), [importData]);

  const alexTriggers: Record<string, string> = {
    identity: "Je récupère vos signaux publics.",
    reputation: "Votre réputation est analysée.",
    aipp_score: "Votre score AIPP actuel est calculé.",
    plan_recommendation: "J'ai trouvé le plan le plus cohérent avec votre profil.",
  };

  const start = useCallback(async () => {
    if (isRunning) return;
    abortRef.current = false;
    setIsRunning(true);
    setIsComplete(false);
    setLines([]);
    setRevealedCards(new Set());
    setAlexMessages([]);
    setCurrentStage("booting");
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 100);

    let lastStage = "";

    for (let i = 0; i < sequence.length; i++) {
      if (abortRef.current) break;
      const raw = sequence[i];

      // Stage transition
      if (raw.stage !== lastStage) {
        if (lastStage) {
          await sleep(prefersReducedMotion ? 50 : preset.stageTransitionMs);
        }
        setCurrentStage(raw.stage as AnimationStage);
        // Alex intervention
        if (alexTriggers[raw.stage] && raw.stage !== lastStage) {
          setAlexMessages(prev => [...prev, alexTriggers[raw.stage]]);
        }
        lastStage = raw.stage;
      }

      // Delay before line
      const delay = raw.type === "boot" ? preset.delayBeforeLineMs * 0.6 : preset.delayBeforeLineMs;
      await sleep(prefersReducedMotion ? 30 : delay);
      if (abortRef.current) break;

      // Add line (start typing)
      const newLine: TerminalLine = {
        ...raw,
        typedChars: 0,
        visible: true,
        timestamp: (Date.now() - startRef.current) / 1000,
      };
      setLines(prev => [...prev, newLine]);

      // Typing animation
      if (!prefersReducedMotion) {
        const typingDurationMs = (raw.totalChars / preset.typingSpeedCharsPerSec) * 1000;
        const steps = Math.min(raw.totalChars, 20);
        const stepMs = typingDurationMs / steps;
        for (let c = 0; c < steps; c++) {
          if (abortRef.current) break;
          await sleep(stepMs);
          const chars = Math.round(((c + 1) / steps) * raw.totalChars);
          setLines(prev => prev.map(l => l.id === raw.id ? { ...l, typedChars: chars } : l));
        }
      }
      // Final full reveal
      setLines(prev => prev.map(l => l.id === raw.id ? { ...l, typedChars: raw.totalChars } : l));

      // Reveal card
      if (raw.revealCard) {
        const revealDelay = raw.revealCard === "aipp_score_card" ? preset.revealScoreDelayMs
          : raw.revealCard === "plan_card" ? preset.revealPlanDelayMs
          : preset.revealCardDelayMs;
        await sleep(prefersReducedMotion ? 50 : revealDelay);
        setRevealedCards(prev => new Set(prev).add(raw.revealCard!));
      }

      // Hold
      await sleep(prefersReducedMotion ? 20 : preset.holdAfterLineMs);
    }

    setCurrentStage("completed");
    setIsComplete(true);
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [sequence, preset, isRunning, prefersReducedMotion]);

  const skip = useCallback(() => {
    abortRef.current = true;
    const allLines = sequence.map((raw, i) => ({
      ...raw,
      typedChars: raw.totalChars,
      visible: true,
      timestamp: i * 0.1,
    }));
    setLines(allLines);
    const allCards = new Set(sequence.filter(l => l.revealCard).map(l => l.revealCard!));
    setRevealedCards(allCards);
    setCurrentStage("completed");
    setIsComplete(true);
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [sequence]);

  useEffect(() => {
    if (autoStart) start();
    return () => {
      abortRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    lines, currentStage, revealedCards, isRunning, isComplete,
    elapsedMs, alexMessages, start, skip, preset,
  };
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
