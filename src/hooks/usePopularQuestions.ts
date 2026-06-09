/**
 * usePopularQuestions — fetches live "Questions populaires en ce moment"
 * from the popular-questions edge function, with seasonal fallback.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getSeasonalPopularQuestions,
  type SeasonalQuestion,
} from "@/data/seasonalPopularQuestions";
import type { AlexIntent } from "@/services/alexOpeningTemplates";

export interface PopularQuestionItem {
  label: string;
  topic: string;
  intent: AlexIntent;
  score?: number;
}

export type PopularQuestionsSource = "trending" | "seasonal";

interface State {
  items: PopularQuestionItem[];
  source: PopularQuestionsSource;
  isLoading: boolean;
}

const REFRESH_MS = 5 * 60 * 1000;

function seasonalFallback(): { items: PopularQuestionItem[]; source: PopularQuestionsSource } {
  const items = getSeasonalPopularQuestions().map((q: SeasonalQuestion) => ({
    label: q.label,
    topic: q.topic,
    intent: q.intent,
  }));
  return { items, source: "seasonal" };
}

export function usePopularQuestions(limit = 6) {
  const [state, setState] = useState<State>(() => ({
    ...seasonalFallback(),
    isLoading: true,
  }));

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("popular-questions", {
        body: { limit },
      });
      if (error) throw error;
      const items: PopularQuestionItem[] = Array.isArray(data?.items) ? data.items : [];
      if (items.length >= 3) {
        setState({ items: items.slice(0, limit), source: "trending", isLoading: false });
        return;
      }
      setState({ ...seasonalFallback(), isLoading: false });
    } catch {
      setState({ ...seasonalFallback(), isLoading: false });
    }
  }, [limit]);

  useEffect(() => {
    let cancelled = false;
    void load();
    const interval = window.setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  return { ...state, refresh: load };
}
