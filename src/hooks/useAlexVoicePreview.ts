/**
 * useAlexVoicePreview — Reusable hook for testing/previewing Alex voice profiles.
 * Calls alex-voice-test edge function and plays the result via alexAudioChannel.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import { toast } from "sonner";

export function useAlexVoicePreview() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      alexAudioChannel.hardStop();
    };
  }, []);

  const play = useCallback(async (profileId: string, profileKey: string, language: string, text: string) => {
    // Stop current playback
    alexAudioChannel.hardStop();

    if (playingId === profileId) {
      setPlayingId(null);
      return;
    }

    setLoadingId(profileId);
    setPlayingId(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            profile_key: profileKey,
            language,
            test_text: text,
          }),
        }
      );

      if (unmountedRef.current) return;

      if (!resp.ok) {
        toast.error("Erreur TTS — impossible de générer l'audio");
        setLoadingId(null);
        return;
      }

      const blob = await resp.blob();
      if (unmountedRef.current) return;

      setLoadingId(null);
      setPlayingId(profileId);

      await alexAudioChannel.playBlob(blob);

      if (!unmountedRef.current) {
        setPlayingId(null);
      }
    } catch {
      if (!unmountedRef.current) {
        toast.error("Erreur de test vocal");
        setLoadingId(null);
        setPlayingId(null);
      }
    }
  }, [playingId]);

  const stop = useCallback(() => {
    alexAudioChannel.hardStop();
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  return { loadingId, playingId, play, stop };
}
