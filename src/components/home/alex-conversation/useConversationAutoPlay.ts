/**
 * useConversationAutoPlay — Drives the deterministic timeline
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { CONVERSATION_TIMELINE, type ConversationStep } from "./data";

export function useConversationAutoPlay(enabled = true) {
  const [visibleSteps, setVisibleSteps] = useState<ConversationStep[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hasStarted = useRef(false);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisibleSteps([]);
    setCurrentIdx(-1);
    setIsPlaying(false);
    setIsComplete(false);
    hasStarted.current = false;
  }, []);

  const advanceStep = useCallback((idx: number) => {
    if (idx >= CONVERSATION_TIMELINE.length) {
      setIsPlaying(false);
      setIsComplete(true);
      return;
    }

    const step = CONVERSATION_TIMELINE[idx];
    const showStep = () => {
      // Replace typing with next real step, or add step
      setVisibleSteps(prev => {
        if (step.type === "typing") return [...prev, step];
        // Remove previous typing
        const filtered = prev.filter(s => s.type !== "typing");
        return [...filtered, step];
      });
      setCurrentIdx(idx);

      // Schedule next
      const nextDelay = (step.duration || 400) + (CONVERSATION_TIMELINE[idx + 1]?.delay || 0);
      timeoutRef.current = setTimeout(() => advanceStep(idx + 1), nextDelay);
    };

    if (step.delay > 0 && idx === 0) {
      timeoutRef.current = setTimeout(showStep, step.delay);
    } else {
      showStep();
    }
  }, []);

  const play = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setIsPlaying(true);
    timeoutRef.current = setTimeout(() => advanceStep(0), CONVERSATION_TIMELINE[0].delay);
  }, [advanceStep]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return { visibleSteps, currentIdx, isPlaying, isComplete, play, reset };
}
