/**
 * useVoiceConfig — Centralized voice configuration hook.
 * Fetches the active voice config from the backend (voice-get-config)
 * and provides it to all voice-consuming components.
 *
 * RULE: No hardcoded voice/agent IDs anywhere in client code.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VoiceConfig {
  agent_id: string | null;
  voice_id: string;
  language_default: "fr" | "en";
  allow_switch: boolean;
  environment?: string;
  label?: string;
}

export interface VoiceMappingStatus {
  valid: boolean;
  last_verified_at: string | null;
  verification_error: string | null;
}

export interface VoiceConfigResult {
  config: VoiceConfig;
  mapping: VoiceMappingStatus | null;
  fallback: boolean;
}

export function useVoiceConfig(environment: string = "prod") {
  return useQuery<VoiceConfigResult>({
    queryKey: ["voice-config", environment],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("voice-get-config", {
        body: { environment },
      });
      if (error) throw new Error(error.message || "Failed to fetch voice config");
      return data as VoiceConfigResult;
    },
    staleTime: 60_000,
    retry: 2,
  });
}

export async function validateVoiceConfig(agentId: string, voiceId?: string) {
  const { data, error } = await supabase.functions.invoke("voice-validate-config", {
    body: { agent_id: agentId, voice_id: voiceId },
  });
  if (error) throw new Error(error.message || "Validation failed");
  return data;
}

export async function logVoiceEvent(event: {
  event_type: string;
  agent_id_used: string;
  voice_id_used?: string;
  language?: string;
  fallback_used?: boolean;
  fallback_reason?: string;
  error_message?: string;
  latency_ms?: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.functions.invoke("voice-runtime-log", { body: event });
  } catch {
    console.warn("[VoiceConfig] Failed to log voice event (non-blocking)");
  }
}
