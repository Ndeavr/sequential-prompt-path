/**
 * useAdaptiveSession — tracks pain selection, intent, and conversion stage.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "homeowner" | "contractor" | "professional" | "condo" | null;
export type ConversionStage = "idle" | "selected" | "engaged" | "converted";

export interface PainOption {
  id: string;
  label: string;
  icon: string;
  heroTitle: string;
  heroSub: string;
  ctaLabel: string;
  ctaHref: string;
  benefits: string[];
}

export function useAdaptiveSession(role: UserRole) {
  const sessionId = useRef(crypto.randomUUID());
  const [selectedPain, setSelectedPain] = useState<PainOption | null>(null);
  const [stage, setStage] = useState<ConversionStage>("idle");

  const trackEvent = useCallback((eventType: string, extra?: Record<string, unknown>) => {
    (supabase as any).from("conversion_events").insert({
      session_id: sessionId.current,
      event_type: eventType,
      value: JSON.stringify({ role, ...extra }),
    }).then(() => {});
  }, [role]);

  const selectPain = useCallback((pain: PainOption) => {
    setSelectedPain(pain);
    setStage("selected");
    trackEvent("pain_selected", { pain_id: pain.id });
  }, [trackEvent]);

  const engage = useCallback(() => {
    setStage("engaged");
    trackEvent("engaged", { pain_id: selectedPain?.id });
  }, [trackEvent, selectedPain]);

  const convert = useCallback(() => {
    setStage("converted");
    trackEvent("converted", { pain_id: selectedPain?.id });
  }, [trackEvent, selectedPain]);

  const reset = useCallback(() => {
    setSelectedPain(null);
    setStage("idle");
  }, []);

  return { sessionId: sessionId.current, selectedPain, stage, selectPain, engage, convert, reset };
}
