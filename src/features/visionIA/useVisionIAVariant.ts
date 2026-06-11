/**
 * Hook A/B Vision IA — assignation déterministe + tracking via experiment_events.
 */
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignVariants, type VisionIAVariantBundle } from "./abVariants";

const EXPERIMENT_KEY = "vision_ia_5y";

export function useVisionIAVariant(companyId: string | undefined): VisionIAVariantBundle | null {
  const variants = useMemo(() => (companyId ? assignVariants(companyId) : null), [companyId]);

  useEffect(() => {
    if (!variants || !companyId) return;
    // Best-effort exposure log
    supabase
      .from("experiment_events" as any)
      .insert({
        experiment_key: EXPERIMENT_KEY,
        event_type: "exposure",
        entity_id: companyId,
        payload: variants as any,
      })
      .then(() => {}, () => {});
  }, [variants, companyId]);

  return variants;
}

export function trackVisionEvent(
  companyId: string,
  eventType: "view" | "scenario_hover" | "cta_click" | "sms_link_click" | "conversion",
  payload: Record<string, any> = {},
) {
  supabase
    .from("experiment_events" as any)
    .insert({
      experiment_key: EXPERIMENT_KEY,
      event_type: eventType,
      entity_id: companyId,
      payload: payload as any,
    })
    .then(() => {}, () => {});
}
