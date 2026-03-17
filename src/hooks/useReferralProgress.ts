/**
 * UNPRO — Referral Progress Hook
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getUserProgress, getMilestonesForRole, type MilestoneConfig } from "@/services/rewardEngine";

export interface ProgressItem {
  milestoneKey: string;
  currentCount: number;
  targetCount: number;
  unlocked: boolean;
  config?: MilestoneConfig;
}

export function useReferralProgress() {
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["referral-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return { progress: [], rewards: [], milestones: [] };
      const { progress, rewards } = await getUserProgress(user.id);
      const milestones = getMilestonesForRole(role || "homeowner");

      const mapped: ProgressItem[] = milestones.map(m => {
        const p = (progress as any[]).find((r: any) => r.milestone_key === m.key);
        return {
          milestoneKey: m.key,
          currentCount: p?.current_count || 0,
          targetCount: m.target,
          unlocked: p?.unlocked || false,
          config: m,
        };
      });

      return { progress: mapped, rewards, milestones };
    },
    enabled: !!user?.id,
  });

  return { progress: data?.progress || [], rewards: data?.rewards || [], milestones: data?.milestones || [], isLoading };
}
