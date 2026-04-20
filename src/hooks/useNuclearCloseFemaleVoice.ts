/**
 * useNuclearCloseFemaleVoice — Speaks the personalized intro using the
 * Nuclear Close female voice (ElevenLabs Charlotte FR / Sarah EN).
 *
 * RULE: This is a local TTS player for the /pro/:slug surface only.
 * It does NOT touch the global locked Alex voice store (which stays masculine).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SpeakOpts = { language?: "fr" | "en" };

export function useNuclearCloseFemaleVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, opts: SpeakOpts = {}) => {
      if (!text?.trim()) return;
      stop();
      setHasError(null);
      try {
        // We must use fetch directly because supabase.functions.invoke parses
        // the body as JSON, which corrupts binary audio.
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pro-landing-tts`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, language: opts.language ?? "fr" }),
        });
        if (!res.ok) throw new Error(`TTS failed (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setHasError("playback_error");
        };
        setIsSpeaking(true);
        await audio.play();
      } catch (err) {
        console.error("[NuclearCloseFemaleVoice]", err);
        setIsSpeaking(false);
        setHasError((err as Error).message);
      }
    },
    [stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, isSpeaking, hasError };
}

/** Resolves prospect data via the public edge function. */
export async function resolveProspect(params: {
  slug?: string;
  token?: string | null;
}) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pro-landing-resolve`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      slug: params.slug,
      token: params.token ?? undefined,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
    }),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Resolve failed (${res.status})`);
  }
  const data = await res.json();
  return data.prospect as {
    id: string;
    company_name: string;
    city: string;
    category: string;
    slug: string;
    rating: number | null;
    reviews_count: number | null;
    has_website: boolean;
    scores: {
      visibility: number;
      trust: number;
      conversion: number;
      speed: number;
      opportunity: number;
      missed: number;
    };
  };
}

/** Logs a CTA click on the landing page (fire & forget). */
export async function logProLandingCta(prospectId: string, cta: string) {
  await supabase.from("pro_landing_views").insert({
    prospect_id: prospectId,
    cta_clicked: cta,
    user_agent: navigator.userAgent,
  });
}
