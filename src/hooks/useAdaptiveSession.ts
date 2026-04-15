/**
 * useAdaptiveSession — tracks pain selection, intent, and conversion stage
 * with local state + optional Supabase persistence.
 */
import { useState, useCallback, useRef, useEffect } from "react";
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
  /** Content blocks that swap in */
  benefits: string[];
}

export interface AdaptiveState {
  role: UserRole;
  selectedPain: PainOption | null;
  stage: ConversionStage;
  sessionId: string;
}

export function useAdaptiveSession(role: UserRole) {
  const sessionId = useRef(crypto.randomUUID());
  const [selectedPain, setSelectedPain] = useState<PainOption | null>(null);
  const [stage, setStage] = useState<ConversionStage>("idle");

  const selectPain = useCallback((pain: PainOption) => {
    setSelectedPain(pain);
    setStage("selected");

    // Fire-and-forget persistence
    supabase.from("conversion_events").insert({
      session_id: sessionId.current,
      event_type: "pain_selected",
      value: JSON.stringify({ role, pain_id: pain.id }),
    }).then(() => {});
  }, [role]);

  const engage = useCallback(() => {
    setStage("engaged");
    supabase.from("conversion_events").insert({
      session_id: sessionId.current,
      event_type: "engaged",
      value: JSON.stringify({ role, pain_id: selectedPain?.id }),
    }).then(() => {});
  }, [role, selectedPain]);

  const convert = useCallback(() => {
    setStage("converted");
    supabase.from("conversion_events").insert({
      session_id: sessionId.current,
      event_type: "converted",
      value: JSON.stringify({ role, pain_id: selectedPain?.id }),
    }).then(() => {});
  }, [role, selectedPain]);

  const reset = useCallback(() => {
    setSelectedPain(null);
    setStage("idle");
  }, []);

  return {
    sessionId: sessionId.current,
    selectedPain,
    stage,
    selectPain,
    engage,
    convert,
    reset,
  };
}
