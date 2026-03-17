/**
 * UNPRO — Qualified Conversion Engine
 * Detects and qualifies conversions based on feature-specific rules.
 */
import { supabase } from "@/integrations/supabase/client";
import { getActiveDeepLinkId, trackDeepLinkEvent } from "./deepLinkTracking";

export type ConversionType = "design_render" | "home_score_reveal" | "booking_submitted";

interface QualifyInput {
  conversionType: ConversionType;
  inviterUserId?: string;
  invitedUserId: string;
  deepLinkId?: string;
}

/**
 * Record a qualified conversion. Enforces:
 * - No self-referral
 * - No duplicate counting
 * - Auth required (invitedUserId must exist)
 */
export async function recordQualifiedConversion(input: QualifyInput) {
  const { conversionType, inviterUserId, invitedUserId, deepLinkId } = input;

  // No self-referral
  if (inviterUserId && inviterUserId === invitedUserId) return null;

  const dlId = deepLinkId || getActiveDeepLinkId();

  // Check for duplicate
  const { data: existing } = await supabase
    .from("qualified_conversions" as any)
    .select("id")
    .eq("invited_user_id", invitedUserId)
    .eq("conversion_type", conversionType)
    .eq("deep_link_id", dlId || "")
    .maybeSingle();

  if (existing) return null;

  const { data, error } = await supabase
    .from("qualified_conversions" as any)
    .insert([{
      deep_link_id: dlId || null,
      inviter_user_id: inviterUserId || null,
      invited_user_id: invitedUserId,
      conversion_type: conversionType,
      is_qualified: true,
      qualified_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (!error && data) {
    trackDeepLinkEvent("feature_completed", dlId || undefined, { conversionType });
    // Trigger reward progress check
    if (inviterUserId) {
      await updateReferralProgress(inviterUserId, conversionType);
    }
  }

  return data;
}

/** Update referral progress after a qualified conversion */
async function updateReferralProgress(userId: string, conversionType: string) {
  try {
    // Get all matching progress rows for this user
    const { data: progressRows } = await supabase
      .from("referral_progress" as any)
      .select("*")
      .eq("user_id", userId);

    if (!progressRows?.length) return;

    for (const row of progressRows) {
      const r = row as any;
      if (r.unlocked) continue;
      const newCount = (r.current_count || 0) + 1;
      const unlocked = newCount >= r.target_count;

      await supabase
        .from("referral_progress" as any)
        .update({
          current_count: newCount,
          unlocked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);

      // If milestone unlocked, create reward
      if (unlocked) {
        await unlockReward(userId, r.milestone_key);
      }
    }
  } catch {
    // Silent
  }
}

/** Unlock a reward based on milestone */
async function unlockReward(userId: string, milestoneKey: string) {
  try {
    // Find matching reward rule
    const { data: rules } = await supabase
      .from("reward_rules" as any)
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules?.length) return;

    // Find best matching rule
    const rule = (rules as any[]).find(r => r.name === milestoneKey) || rules[0];

    await supabase.from("rewards" as any).insert([{
      user_id: userId,
      reward_type: rule.reward_type,
      reward_value: JSON.stringify(rule.reward_value),
      status: "pending",
    }]);
  } catch {
    // Silent
  }
}

/** Feature-specific qualification checks */
export const qualifyDesignRender = (invitedUserId: string, inviterUserId?: string, deepLinkId?: string) =>
  recordQualifiedConversion({ conversionType: "design_render", invitedUserId, inviterUserId, deepLinkId });

export const qualifyHomeScoreReveal = (invitedUserId: string, inviterUserId?: string, deepLinkId?: string) =>
  recordQualifiedConversion({ conversionType: "home_score_reveal", invitedUserId, inviterUserId, deepLinkId });

export const qualifyBookingSubmitted = (invitedUserId: string, inviterUserId?: string, deepLinkId?: string) =>
  recordQualifiedConversion({ conversionType: "booking_submitted", invitedUserId, inviterUserId, deepLinkId });
