/**
 * UNPRO — Affiliate Tracking Hook
 * Captures clicks, manages sessions, detects sources, confirms referrals.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const SESSION_KEY = "unpro_aff_session";
const REF_KEY = "unpro_aff_ref";

interface DetectedSource {
  detected: boolean;
  affiliate_id?: string;
  affiliate_name?: string;
  referral_code?: string;
  confidence_score?: number;
  source?: string;
}

export function useAffiliateTracking() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [detectedSource, setDetectedSource] = useState<DetectedSource | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Step 1: Capture click on mount if ref param exists
  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("aff");
    if (!ref) return;

    // Store locally
    try {
      localStorage.setItem(REF_KEY, ref);
    } catch {}

    // Capture click (fire-and-forget)
    const sessionToken = getOrCreateSession();
    supabase.from("affiliate_clicks" as any).insert({
      ref_code: ref,
      source: searchParams.get("utm_source") || "direct",
      device: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
      landing_url: window.location.href,
    }).then(() => {});

    // Create session
    supabase.from("affiliate_sessions" as any).insert({
      session_token: sessionToken,
      ref_code: ref,
      status: "active",
      device: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
    }).then(() => {});
  }, [searchParams]);

  // Step 2: Detect source
  const detectSource = useCallback(async (): Promise<DetectedSource> => {
    setIsDetecting(true);
    try {
      const refCode = localStorage.getItem(REF_KEY) || searchParams.get("ref") || undefined;
      const sessionToken = sessionStorage.getItem(SESSION_KEY) || undefined;

      const { data } = await supabase.rpc("detect_referral_source", {
        p_ref_code: refCode || null,
        p_session_token: sessionToken || null,
      });

      const result = (data as unknown as DetectedSource) || { detected: false };
      setDetectedSource(result);
      return result;
    } catch {
      const fallback: DetectedSource = { detected: false };
      setDetectedSource(fallback);
      return fallback;
    } finally {
      setIsDetecting(false);
    }
  }, [searchParams]);

  // Step 3: Confirm referral
  const confirmReferral = useCallback(async (attributionId: string, confirmed: boolean) => {
    const { data } = await supabase.rpc("confirm_referral_attribution", {
      p_attribution_id: attributionId,
      p_confirmed: confirmed,
    });
    if (!confirmed) {
      try { localStorage.removeItem(REF_KEY); } catch {}
    }
    return data;
  }, []);

  // Step 4: Track conversion
  const trackConversion = useCallback(async (
    conversionType: string,
    valueCents: number = 0
  ) => {
    if (!user?.id) return null;
    const { data } = await supabase.rpc("track_affiliate_conversion", {
      p_user_id: user.id,
      p_conversion_type: conversionType,
      p_value_cents: valueCents,
    });
    return data;
  }, [user?.id]);

  return {
    detectedSource,
    isDetecting,
    detectSource,
    confirmReferral,
    trackConversion,
    hasStoredRef: () => !!localStorage.getItem(REF_KEY),
  };
}

function getOrCreateSession(): string {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}
