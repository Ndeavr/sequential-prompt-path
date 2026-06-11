/**
 * Hook A/B Vision IA — assignation déterministe + tracking via experiment_events.
 */
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assignVariants, type VisionIAVariantBundle } from "./abVariants";

const EXPERIMENT_KEY = "vision_ia_5y";

function logEvent(companyId: string, eventType: string, metadata: Record<string, any>) {
  supabase
    .from("experiment_events" as any)
    .insert({
      event_type: eventType,
      screen_key: EXPERIMENT_KEY,
      metadata: { ...metadata, company_id: companyId, experiment_key: EXPERIMENT_KEY } as any,
    })
    .then(() => {}, () => {});
}

export function useVisionIAVariant(companyId: string | undefined): VisionIAVariantBundle | null {
  const variants = useMemo(() => (companyId ? assignVariants(companyId) : null), [companyId]);

  useEffect(() => {
    if (!variants || !companyId) return;
    logEvent(companyId, "exposure", variants as any);
  }, [variants, companyId]);

  return variants;
}

export function trackVisionEvent(
  companyId: string,
  eventType: "view" | "scenario_hover" | "cta_click" | "sms_link_click" | "conversion",
  payload: Record<string, any> = {},
) {
  logEvent(companyId, eventType, payload);
}
