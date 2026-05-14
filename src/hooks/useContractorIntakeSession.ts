/**
 * UNPRO — Contractor diagnostic intake session.
 *
 * Lightweight wrapper over `contractor_intake_sessions`. Creates a guest row
 * keyed by an anonymous local id, then patches it as the user progresses
 * through the diagnostic landing flow. Auth users get `user_id` populated
 * the next time they patch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "unpro_intake_anon_id";
const SESSION_KEY = "unpro_intake_session_id";

export type IntakeMode = "alex" | "form";

export interface IntakePatch {
  mode?: IntakeMode;
  company_name?: string | null;
  website?: string | null;
  phone?: string | null;
  rbq?: string | null;
  detected_trade?: string | null;
  detected_region?: string | null;
  answers?: Record<string, unknown>;
  ai_summary?: string | null;
  recommended_plan?: string | null;
  projected_revenue_low?: number | null;
  projected_revenue_high?: number | null;
  aipp_score?: number | null;
  completion_percentage?: number;
}

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function useContractorIntakeSession(initialMode: IntakeMode = "alex") {
  const [sessionId, setSessionId] = useState<string | null>(
    typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null,
  );
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (sessionId) return;

    (async () => {
      const anon = getAnonId();
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("contractor_intake_sessions")
        .insert({
          mode: initialMode,
          anon_session_id: anon,
          user_id: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) {
        console.warn("[intake] insert failed", error);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, data.id);
      setSessionId(data.id);
    })();
  }, [initialMode, sessionId]);

  const patch = useCallback(
    async (changes: IntakePatch) => {
      if (!sessionId) return;
      const { error } = await supabase
        .from("contractor_intake_sessions")
        .update(changes as never)
        .eq("id", sessionId);
      if (error) console.warn("[intake] patch failed", error);
    },
    [sessionId],
  );

  return { sessionId, patch };
}
