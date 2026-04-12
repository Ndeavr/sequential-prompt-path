/**
 * useScoreRevealEngine — State machine for the score reveal flow.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { generateRevealScript, type RevealStep } from "@/services/scoreRevealService";
import { supabase } from "@/integrations/supabase/client";

export type RevealStage = "preparing" | "speaking" | "revealing" | "revealed" | "interpreting" | "complete";

interface TranscriptLine {
  text: string;
  isHighlight?: boolean;
}

interface RevealState {
  stage: RevealStage;
  scoreRevealed: boolean;
  interpretationVisible: boolean;
  subScoresVisible: boolean;
  weaknessVisible: boolean;
  quickWinsVisible: boolean;
  transcript: TranscriptLine[];
  isTyping: boolean;
  currentStepIndex: number;
}

export function useScoreRevealEngine(score: number, sessionId?: string) {
  const [state, setState] = useState<RevealState>({
    stage: "preparing",
    scoreRevealed: false,
    interpretationVisible: false,
    subScoresVisible: false,
    weaknessVisible: false,
    quickWinsVisible: false,
    transcript: [],
    isTyping: false,
    currentStepIndex: 0,
  });

  const steps = useRef<RevealStep[]>(generateRevealScript(score));
  const running = useRef(false);
  const cancelled = useRef(false);

  const logEvent = useCallback(async (eventKey: string, value?: string) => {
    if (!sessionId) return;
    try {
      await supabase.from("alex_score_reveal_events").insert({
        session_id: sessionId,
        event_key: eventKey,
        event_value: value,
      } as never);
    } catch { /* silent */ }
  }, [sessionId]);

  const updateSessionStatus = useCallback(async (status: string, stepIndex: number) => {
    if (!sessionId) return;
    try {
      await supabase.from("alex_score_reveal_sessions")
        .update({ reveal_status: status, current_step_index: stepIndex, last_active_at: new Date().toISOString() } as never)
        .eq("id", sessionId);
    } catch { /* silent */ }
  }, [sessionId]);

  const runSequence = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    cancelled.current = false;

    const allSteps = steps.current;

    for (let i = 0; i < allSteps.length; i++) {
      if (cancelled.current) break;
      const step = allSteps[i];

      // Add to transcript with typing effect
      setState(s => ({ ...s, isTyping: true, currentStepIndex: i }));
      await delay(600);

      if (cancelled.current) break;

      // Show text in transcript
      setState(s => ({
        ...s,
        isTyping: false,
        transcript: [...s.transcript, {
          text: step.spokenText,
          isHighlight: step.triggerType === "reveal",
        }],
      }));

      // Handle triggers
      if (step.triggerType === "reveal") {
        setState(s => ({ ...s, stage: "revealing" }));
        await logEvent("reveal_start");
        await updateSessionStatus("awaiting_reveal", i);
        await delay(1500); // dramatic pause
        setState(s => ({ ...s, stage: "revealed", scoreRevealed: true }));
        await logEvent("score_revealed", String(score));
        await updateSessionStatus("score_revealed", i);
      } else if (step.triggerType === "interpret") {
        setState(s => ({ ...s, stage: "interpreting", interpretationVisible: true }));
        await logEvent("interpretation_start");
        await updateSessionStatus("interpreting", i);
      } else {
        if (i === 0) {
          setState(s => ({ ...s, stage: "speaking" }));
          await updateSessionStatus("intro_playing", i);
        }
      }

      await delay(step.delayMs);
    }

    if (!cancelled.current) {
      // Show post-reveal sections sequentially
      setState(s => ({ ...s, subScoresVisible: true }));
      await delay(1000);
      setState(s => ({ ...s, weaknessVisible: true }));
      await delay(800);
      setState(s => ({ ...s, quickWinsVisible: true, stage: "complete" }));
      await logEvent("reveal_complete");
      await updateSessionStatus("completed", allSteps.length);
    }

    running.current = false;
  }, [score, logEvent, updateSessionStatus]);

  const replay = useCallback(() => {
    cancelled.current = true;
    running.current = false;
    setState({
      stage: "preparing",
      scoreRevealed: false,
      interpretationVisible: false,
      subScoresVisible: false,
      weaknessVisible: false,
      quickWinsVisible: false,
      transcript: [],
      isTyping: false,
      currentStepIndex: 0,
    });
    setTimeout(() => runSequence(), 300);
  }, [runSequence]);

  useEffect(() => {
    return () => { cancelled.current = true; };
  }, []);

  return {
    ...state,
    startReveal: runSequence,
    replay,
  };
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
