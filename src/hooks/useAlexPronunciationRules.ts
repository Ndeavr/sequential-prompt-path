/**
 * useAlexPronunciationRules — Hook that loads DB pronunciation rules
 * and provides apply/refresh functions for the voice pipeline.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPronunciationRules,
  applyPronunciationRules,
  clearPronunciationCache,
  type PronunciationRule,
} from "@/services/alexPronunciationRulesService";

export function useAlexPronunciationRules(locale: string = "fr-CA") {
  const [rules, setRules] = useState<PronunciationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const rulesRef = useRef<PronunciationRule[]>([]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await fetchPronunciationRules(locale);
      setRules(fetched);
      rulesRef.current = fetched;
    } catch (e) {
      console.warn("[PronunciationRules] Load failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const apply = useCallback(
    (text: string) => applyPronunciationRules(text, rulesRef.current),
    []
  );

  const refresh = useCallback(() => {
    clearPronunciationCache();
    return loadRules();
  }, [loadRules]);

  return { rules, isLoading, apply, refresh };
}
