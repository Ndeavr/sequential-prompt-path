/**
 * Hook to check the current contractor's subscription plan.
 * Returns plan info and whether specific features are unlocked.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";

const PLAN_HIERARCHY: PlanCode[] = ["recrue", "pro", "premium", "elite", "signature"];

interface ContractorPlanData {
  contractorId: string | null;
  planCode: PlanCode;
  isSignature: boolean;
  isEliteOrAbove: boolean;
  isPremiumOrAbove: boolean;
  isLoading: boolean;
  canAccessBooking: boolean;
  planLabel: string;
}

const PLAN_LABELS: Record<PlanCode, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export function useContractorPlan(): ContractorPlanData {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["contractor-plan", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      // Get contractor
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!contractor) return null;

      // Get active subscription
      const { data: sub } = await supabase
        .from("contractor_subscriptions")
        .select("plan_code")
        .eq("contractor_id", contractor.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        contractorId: contractor.id,
        planCode: (sub?.plan_code as PlanCode) ?? "recrue",
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 60_000,
  });

  const planCode = data?.planCode ?? "recrue";
  const planIndex = PLAN_HIERARCHY.indexOf(planCode);

  return {
    contractorId: data?.contractorId ?? null,
    planCode,
    isSignature: planCode === "signature",
    isEliteOrAbove: planIndex >= PLAN_HIERARCHY.indexOf("elite"),
    isPremiumOrAbove: planIndex >= PLAN_HIERARCHY.indexOf("premium"),
    isLoading,
    canAccessBooking: planCode === "signature",
    planLabel: PLAN_LABELS[planCode],
  };
}
