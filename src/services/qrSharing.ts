/**
 * UNPRO — QR Sharing Service
 * Builds share URLs, tracks scans, logs conversions.
 */
import { supabase } from "@/integrations/supabase/client";

export function buildUnlockUrl(params: {
  intent: string;
  referrerId?: string;
  role?: string;
  variant?: string;
  campaign?: string;
}): string {
  const base = window.location.origin;
  const sp = new URLSearchParams({
    source: "qr",
    medium: "mobile_share",
    intent: params.intent,
    variant: params.variant || "a",
  });
  if (params.referrerId) sp.set("referrer_id", params.referrerId);
  if (params.role) sp.set("role", params.role);
  if (params.campaign) sp.set("campaign", params.campaign);
  return `${base}/unlock?${sp.toString()}`;
}

export async function logQrScan(params: {
  intentSlug: string;
  referrerUserId?: string;
  variant?: string;
  sessionId?: string;
}): Promise<void> {
  try {
    await supabase.from("qr_scans" as any).insert({
      intent_slug: params.intentSlug,
      referrer_user_id: params.referrerUserId || null,
      variant: params.variant || null,
      session_id: params.sessionId || null,
      user_agent: navigator.userAgent.substring(0, 200),
      source: "qr",
      medium: "mobile_share",
    });
  } catch {
    // Silent — never break UX
  }
}

export async function logQrConversion(params: {
  intentSlug: string;
  referrerUserId?: string;
  convertedUserId?: string;
  conversionType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from("qr_conversions" as any).insert({
      intent_slug: params.intentSlug,
      referrer_user_id: params.referrerUserId || null,
      converted_user_id: params.convertedUserId || null,
      conversion_type: params.conversionType,
      metadata: params.metadata || {},
    });
  } catch {}
}

export async function getAmbassadorOfferStatus(): Promise<{
  totalSlots: number;
  claimedCount: number;
  remaining: number;
  isActive: boolean;
}> {
  const { data } = await supabase
    .from("ambassador_offers" as any)
    .select("total_slots, claimed_count, is_active")
    .eq("intent_slug", "ambassador-lifetime")
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return { totalSlots: 50, claimedCount: 0, remaining: 50, isActive: false };
  const d = data as any;
  return {
    totalSlots: d.total_slots,
    claimedCount: d.claimed_count,
    remaining: d.total_slots - d.claimed_count,
    isActive: d.is_active,
  };
}

export async function getUserQrStats(userId: string): Promise<{
  totalScans: number;
  totalSignups: number;
  totalBookings: number;
  topIntent: string | null;
}> {
  const [scansRes, signupsRes, bookingsRes] = await Promise.all([
    supabase.from("qr_scans" as any).select("id", { count: "exact", head: true }).eq("referrer_user_id", userId),
    supabase.from("qr_conversions" as any).select("id", { count: "exact", head: true }).eq("referrer_user_id", userId).eq("conversion_type", "signup"),
    supabase.from("qr_conversions" as any).select("id", { count: "exact", head: true }).eq("referrer_user_id", userId).eq("conversion_type", "booking"),
  ]);

  // Get top intent
  const { data: topData } = await supabase
    .from("qr_scans" as any)
    .select("intent_slug")
    .eq("referrer_user_id", userId)
    .limit(100);

  let topIntent: string | null = null;
  if (topData && topData.length > 0) {
    const counts: Record<string, number> = {};
    (topData as any[]).forEach((s) => {
      counts[s.intent_slug] = (counts[s.intent_slug] || 0) + 1;
    });
    topIntent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  return {
    totalScans: scansRes.count || 0,
    totalSignups: signupsRes.count || 0,
    totalBookings: bookingsRes.count || 0,
    topIntent,
  };
}
