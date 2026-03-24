/**
 * UNPRO — Prompt Cooldown Guard
 * Prevents spamming the share prompt.
 */
import { useState, useCallback } from "react";

const COOLDOWN_MS = 30_000; // 30 seconds between prompts
const MAX_PER_SESSION = 5;

export function usePromptCooldownGuard() {
  const [lastShownAt, setLastShownAt] = useState<number>(0);
  const [shownCount, setShownCount] = useState(0);

  const canShowPrompt = useCallback(() => {
    const now = Date.now();
    if (shownCount >= MAX_PER_SESSION) return false;
    if (now - lastShownAt < COOLDOWN_MS) return false;
    return true;
  }, [lastShownAt, shownCount]);

  const markShown = useCallback(() => {
    setLastShownAt(Date.now());
    setShownCount((c) => c + 1);
  }, []);

  return { canShowPrompt, markShown, shownCount };
}
