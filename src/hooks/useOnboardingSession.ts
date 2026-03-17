/**
 * Hook to persist/resume onboarding session in the database.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OnboardingSessionData {
  id?: string;
  current_step: number;
  business_name: string;
  import_form: Record<string, any>;
  business_data: Record<string, any>;
  audit_sections: any[];
  aipp_score: any | null;
  objective: string;
  selected_plan: any | null;
  completed_at: string | null;
}

const DEFAULT_SESSION: OnboardingSessionData = {
  current_step: 0,
  business_name: "",
  import_form: {},
  business_data: {},
  audit_sections: [],
  aipp_score: null,
  objective: "",
  selected_plan: null,
  completed_at: null,
};

export const useOnboardingSession = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<OnboardingSessionData>(DEFAULT_SESSION);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing session on mount
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("contractor_onboarding_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && !error) {
        setSession({
          id: data.id,
          current_step: data.current_step,
          business_name: data.business_name || "",
          import_form: (data.import_form as Record<string, any>) || {},
          business_data: (data.business_data as Record<string, any>) || {},
          audit_sections: (data.audit_sections as any[]) || [],
          aipp_score: data.aipp_score,
          objective: (data.selected_plan as any)?.objective || "",
          selected_plan: data.selected_plan,
          completed_at: data.completed_at,
        });
        setSessionId(data.id);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const saveSession = useCallback(async (updates: Partial<OnboardingSessionData>) => {
    if (!user?.id) return;
    const merged = { ...session, ...updates };
    setSession(merged);

    const payload = {
      user_id: user.id,
      current_step: merged.current_step,
      business_name: merged.business_name,
      import_form: merged.import_form,
      business_data: merged.business_data,
      audit_sections: merged.audit_sections,
      aipp_score: merged.aipp_score,
      objective: merged.objective,
      selected_plan: merged.selected_plan,
      completed_at: merged.completed_at,
    };

    if (sessionId) {
      await supabase
        .from("contractor_onboarding_sessions")
        .update(payload)
        .eq("id", sessionId);
    } else {
      const { data } = await supabase
        .from("contractor_onboarding_sessions")
        .insert(payload)
        .select("id")
        .single();
      if (data) setSessionId(data.id);
    }
  }, [user?.id, session, sessionId]);

  const markComplete = useCallback(async () => {
    await saveSession({ completed_at: new Date().toISOString() });
  }, [saveSession]);

  return { session, loading, saveSession, markComplete };
};
