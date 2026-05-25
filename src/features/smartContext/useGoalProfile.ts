/**
 * useGoalProfile — contractor goal CRUD.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";
import type { GoalKey } from "./types";

export interface GoalProfile {
  contractor_id: string;
  primary_goal: GoalKey;
  secondary_goals: GoalKey[];
  capacity_per_month: number | null;
  avg_contract_value: number | null;
}

export function useGoalProfile() {
  const { data: profile } = useContractorProfile();
  const qc = useQueryClient();
  const contractorId = profile?.id;

  const query = useQuery<GoalProfile | null>({
    queryKey: ["goal-profile", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("contractor_goal_profiles")
        .select("*")
        .eq("contractor_id", contractorId)
        .maybeSingle();
      return (data as GoalProfile | null) ?? null;
    },
    staleTime: 60_000,
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<GoalProfile> & { primary_goal: GoalKey }) => {
      if (!contractorId) throw new Error("Profil entrepreneur requis");
      const { error } = await (supabase as any)
        .from("contractor_goal_profiles")
        .upsert(
          {
            contractor_id: contractorId,
            primary_goal: input.primary_goal,
            secondary_goals: input.secondary_goals ?? [],
            capacity_per_month: input.capacity_per_month ?? null,
            avg_contract_value: input.avg_contract_value ?? null,
          },
          { onConflict: "contractor_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-profile", contractorId] });
    },
  });

  return { ...query, upsert };
}
