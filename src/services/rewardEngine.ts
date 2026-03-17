/**
 * UNPRO — Reward Engine
 * Manages referral milestones and reward unlocking.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MilestoneConfig {
  key: string;
  label: string;
  target: number;
  rewardType: string;
  rewardLabel: string;
  icon: string;
}

export const HOMEOWNER_MILESTONES: MilestoneConfig[] = [
  { key: "ho_3", label: "3 conversions", target: 3, rewardType: "perk", rewardLabel: "Avantage spécial", icon: "Gift" },
  { key: "ho_5", label: "5 conversions", target: 5, rewardType: "coffee", rewardLabel: "Café offert ☕", icon: "Coffee" },
  { key: "ho_10", label: "10 conversions", target: 10, rewardType: "badge", rewardLabel: "Badge Ambassadeur 🏅", icon: "Award" },
];

export const CONTRACTOR_MILESTONES: MilestoneConfig[] = [
  { key: "co_2", label: "2 conversions", target: 2, rewardType: "boost", rewardLabel: "Boost visibilité", icon: "TrendingUp" },
  { key: "co_4", label: "4 conversions", target: 4, rewardType: "coffee", rewardLabel: "Café offert ☕", icon: "Coffee" },
  { key: "co_8", label: "8 conversions", target: 8, rewardType: "featured", rewardLabel: "Profil vedette ⭐", icon: "Star" },
];

export const CONDO_MILESTONES: MilestoneConfig[] = [
  { key: "cd_3", label: "3 conversions", target: 3, rewardType: "tools", rewardLabel: "Outils débloqués 🔧", icon: "Wrench" },
  { key: "cd_5", label: "5 conversions", target: 5, rewardType: "badge", rewardLabel: "Badge Syndic 🏅", icon: "Award" },
  { key: "cd_10", label: "10 conversions", target: 10, rewardType: "premium", rewardLabel: "Accès Premium", icon: "Crown" },
];

export function getMilestonesForRole(role: string): MilestoneConfig[] {
  if (role === "contractor") return CONTRACTOR_MILESTONES;
  if (role === "condo") return CONDO_MILESTONES;
  return HOMEOWNER_MILESTONES;
}

/** Initialize progress rows for a user */
export async function initializeProgress(userId: string, role: string) {
  const milestones = getMilestonesForRole(role);
  
  for (const m of milestones) {
    await supabase.from("referral_progress" as any).upsert({
      user_id: userId,
      milestone_key: m.key,
      current_count: 0,
      target_count: m.target,
      unlocked: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,milestone_key" });
  }
}

/** Fetch user's progress and rewards */
export async function getUserProgress(userId: string) {
  const [{ data: progress }, { data: rewards }] = await Promise.all([
    supabase.from("referral_progress" as any).select("*").eq("user_id", userId).order("target_count"),
    supabase.from("rewards" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  return { progress: progress || [], rewards: rewards || [] };
}
