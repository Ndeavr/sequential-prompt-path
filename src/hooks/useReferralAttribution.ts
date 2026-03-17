/**
 * UNPRO — Universal Referral Attribution Hook
 * Handles storing/reading referral codes from URL params and localStorage.
 */
import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "unpro_ref";
const INTENT_KEY = "unpro_ref_intent";

export interface Attribution {
  refCode: string;
  intent?: string;
  utmSource?: string;
  capturedAt: string;
}

/** Capture attribution from URL params and persist to localStorage */
export function captureAttribution(params: URLSearchParams) {
  const ref = params.get("ref");
  const intent = params.get("intent");
  const utmSource = params.get("utm_source");

  if (!ref) return null;

  const attribution: Attribution = {
    refCode: ref,
    intent: intent || undefined,
    utmSource: utmSource || undefined,
    capturedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {}

  return attribution;
}

/** Read stored attribution */
export function getStoredAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear stored attribution */
export function clearAttribution() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INTENT_KEY);
  } catch {}
}

/** Track a referral event (fire-and-forget) */
export async function trackReferralEvent(
  eventType: string,
  referralCode: string,
  extra?: { role?: string; targetType?: string; metadata?: Record<string, unknown> }
) {
  try {
    await supabase.from("referral_events" as any).insert({
      referral_code: referralCode,
      event_type: eventType,
      role: extra?.role || null,
      target_type: extra?.targetType || null,
      metadata: extra?.metadata || {},
    });
  } catch {}
}

/** Complete attribution on signup — link referred user to referrer */
export async function completeAttribution(referredUserId: string) {
  const attr = getStoredAttribution();
  if (!attr) return;

  try {
    // Find referrer
    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", attr.refCode)
      .maybeSingle();

    if (referrer) {
      // Update invited_by on the new user's profile
      await supabase
        .from("profiles")
        .update({ invited_by_user_id: referrer.user_id } as any)
        .eq("user_id", referredUserId);

      // Create attribution record
      await supabase.from("affiliate_attributions" as any).insert({
        referral_code: attr.refCode,
        referrer_user_id: referrer.user_id,
        referred_user_id: referredUserId,
        conversion_type: "signup",
        role_origin: attr.utmSource === "affiliate" ? "affiliate" : "organic",
        metadata: { intent: attr.intent, utm_source: attr.utmSource },
      });

      // Track event
      await trackReferralEvent("signup_complete", attr.refCode, {
        targetType: "signup",
        metadata: { referred_user_id: referredUserId },
      });
    }

    clearAttribution();
  } catch {}
}

/** Main hook — auto-captures attribution from URL on mount */
export const useReferralAttribution = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    captureAttribution(searchParams);
  }, [searchParams]);

  // On auth, complete attribution if user just signed up
  useEffect(() => {
    if (user?.id) {
      const attr = getStoredAttribution();
      if (attr) {
        completeAttribution(user.id);
      }
    }
  }, [user?.id]);

  const getAttribution = useCallback(() => getStoredAttribution(), []);

  return { getAttribution, clearAttribution };
};
