/**
 * useAlexVoicePersona — Voice profile selection with language auto-detection.
 * 
 * Rules:
 * - Always premium female voice
 * - FR priority, EN fallback
 * - Zero accent mixing
 * - Provider: ElevenLabs
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VoiceLanguage = "fr" | "en";

interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  language: string;
  voice_provider: string;
  voice_id_primary: string;
  tone_style: string;
  is_active: boolean;
}

/** Detect language from text input */
export function detectLanguage(text: string): VoiceLanguage {
  if (!text) return "fr";
  const frPattern = /[àâäéèêëïîôùûüÿçœæ]|qu'|l'|d'|n'|j'|c'est|je suis|bonjour|merci|oui|non|maison|travaux|besoin/i;
  const enPattern = /\b(the|is|are|was|were|have|has|with|this|that|from|your|what|how|when|where|need|help|home|house)\b/i;
  
  const frScore = (text.match(frPattern) || []).length;
  const enScore = (text.match(enPattern) || []).length;
  
  return frScore >= enScore ? "fr" : "en";
}

export function useAlexVoicePersona() {
  const [activeLanguage, setActiveLanguage] = useState<VoiceLanguage>("fr");
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["alex-voice-profiles-persona"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alex_voice_profiles")
        .select("id, name, gender, language, voice_provider, voice_id_primary, tone_style, is_active, profile_key")
        .eq("is_active", true)
        .order("language");
      return (data || []) as VoiceProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeProfile = useMemo(() => {
    // Find female profile for current language, fallback to any active
    const langProfiles = profiles.filter(p => p.language === activeLanguage && p.gender === "female");
    return langProfiles[0] || profiles.find(p => p.language === activeLanguage) || profiles[0] || null;
  }, [profiles, activeLanguage]);

  const switchLanguage = useCallback((lang: VoiceLanguage) => {
    setActiveLanguage(lang);
  }, []);

  const autoDetectAndSwitch = useCallback((text: string) => {
    const detected = detectLanguage(text);
    if (detected !== activeLanguage) {
      setActiveLanguage(detected);
    }
    return detected;
  }, [activeLanguage]);

  return {
    activeLanguage,
    activeProfile,
    profiles,
    isPlaying,
    setIsPlaying,
    switchLanguage,
    autoDetectAndSwitch,
    detectLanguage,
  };
}
