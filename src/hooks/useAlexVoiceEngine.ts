/**
 * useAlexVoiceEngine — Hooks for the Alex French Voice Selector & Context Engine.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Voice Profiles ──
export function useVoiceProfiles() {
  return useQuery({
    queryKey: ["alex-voice-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_voice_profiles")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Test Phrases ──
export function useVoiceTestPhrases() {
  return useQuery({
    queryKey: ["alex-voice-test-phrases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_voice_test_phrases")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Voice Tests ──
export function useVoiceTests(voiceProfileId?: string) {
  return useQuery({
    queryKey: ["alex-voice-tests", voiceProfileId],
    queryFn: async () => {
      let q = supabase.from("alex_voice_tests").select("*, alex_voice_test_phrases(*)").order("created_at", { ascending: false });
      if (voiceProfileId) q = q.eq("voice_profile_id", voiceProfileId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!voiceProfileId,
  });
}

export function useSaveVoiceTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (test: {
      voice_profile_id: string;
      test_phrase_id: string;
      clarity_score?: number;
      french_accent_score?: number;
      no_english_accent_score?: number;
      warmth_score?: number;
      trust_score?: number;
      construction_vocab_score?: number;
      naturalness_score?: number;
      admin_notes?: string;
    }) => {
      const { error } = await supabase.from("alex_voice_tests").insert(test as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alex-voice-tests"] }),
  });
}

// ── Fallbacks ──
export function useVoiceFallbacks() {
  return useQuery({
    queryKey: ["alex-voice-fallbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_voice_fallbacks")
        .select("*, primary:alex_voice_profiles!alex_voice_fallbacks_primary_voice_profile_id_fkey(*), fallback:alex_voice_profiles!alex_voice_fallbacks_fallback_voice_profile_id_fkey(*)")
        .eq("is_active", true)
        .order("priority_rank");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveFallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fb: { primary_voice_profile_id: string; fallback_voice_profile_id: string; priority_rank: number }) => {
      const { error } = await supabase.from("alex_voice_fallbacks").insert(fb as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alex-voice-fallbacks"] }),
  });
}

// ── Transcript Corrections ──
export function useTranscriptCorrections() {
  return useQuery({
    queryKey: ["alex-transcript-corrections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_transcript_corrections")
        .select("*")
        .order("priority_rank", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveTranscriptCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { raw_pattern: string; normalized_value: string; category?: string; is_regex?: boolean }) => {
      const { error } = await supabase.from("alex_transcript_corrections").insert(c as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alex-transcript-corrections"] }),
  });
}

// ── Intent Rules ──
export function useIntentRules() {
  return useQuery({
    queryKey: ["alex-intent-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_intent_rules")
        .select("*")
        .eq("is_active", true)
        .order("priority_rank");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Context Sessions ──
export function useContextSessions(limit = 50) {
  return useQuery({
    queryKey: ["alex-context-sessions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_context_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContextEvents(sessionId?: string) {
  return useQuery({
    queryKey: ["alex-context-events", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_context_events")
        .select("*")
        .eq("context_session_id", sessionId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sessionId,
  });
}

// ── Understanding Logs ──
export function useUnderstandingLogs(limit = 100) {
  return useQuery({
    queryKey: ["alex-understanding-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_understanding_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Runtime Metrics ──
export function useVoiceRuntimeMetrics(days = 30) {
  return useQuery({
    queryKey: ["alex-voice-runtime-metrics", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("alex_voice_runtime_metrics")
        .select("*")
        .gte("day_bucket", since.toISOString().split("T")[0])
        .order("day_bucket", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
