/**
 * Hook to check the current contractor's subscription plan.
 * Canonical source of truth: public.contractor_plan_code() → public.plans.
 * Legacy plan codes (recrue / elite / signature) are resolved server-side.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PlanCode =
  | "presence"
  | "local"
  | "croissance"
  | "pro"
  | "premium"
  | "domination";

const PLAN_HIERARCHY: PlanCode[] = [
  "presence",
  "local",
  "croissance",
  "pro",
  "premium",
  "domination",
];

const LEGACY_ALIAS: Record<string, PlanCode> = {
  recrue: "presence",
  elite: "premium",
  signature: "domination",
};

interface ContractorPlanData {
  contractorId: string | null;
  planCode: PlanCode;
  planSource: string | null;
  trialEndsAt: string | null;
  isOnTrial: boolean;
  isDomination: boolean;
  isPremiumOrAbove: boolean;
  isCroissanceOrAbove: boolean;
  isLoading: boolean;
  canAccessBooking: boolean;
  planLabel: string;
}

const PLAN_LABELS: Record<PlanCode, string> = {
  presence: "Présence",
  local: "Local",
  croissance: "Croissance",
  pro: "Pro",
  premium: "Premium",
  domination: "Domination",
};

function normalize(code: string | null | undefined): PlanCode {
  if (!code) return "presence";
  if (LEGACY_ALIAS[code]) return LEGACY_ALIAS[code];
  return (PLAN_HIERARCHY.includes(code as PlanCode) ? code : "presence") as PlanCode;
}

export function useContractorPlan(): ContractorPlanData {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["contractor-plan", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Canonical plan resolution (handles trials, legacy codes, no subscription)
      const { data: resolved } = await supabase.rpc("contractor_plan_code" as any, {
        _user_id: session.user.id,
      });

      const { data: sub } = await supabase
        .from("contractor_subscriptions")
        .select("plan_id, plan_source, trial_ends_at")
        .eq("contractor_id", contractor?.id ?? "")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        contractorId: contractor?.id ?? null,
        planCode: normalize((resolved as string | null) ?? (sub?.plan_id as string | null)),
        planSource: (sub as any)?.plan_source ?? null,
        trialEndsAt: (sub as any)?.trial_ends_at ?? null,
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 60_000,
  });

  const planCode = data?.planCode ?? "presence";
  const planIndex = PLAN_HIERARCHY.indexOf(planCode);
  const trialEndsAt = data?.trialEndsAt ?? null;

  return {
    contractorId: data?.contractorId ?? null,
    planCode,
    planSource: data?.planSource ?? null,
    trialEndsAt,
    isOnTrial: !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now(),
    isDomination: planCode === "domination",
    isPremiumOrAbove: planIndex >= PLAN_HIERARCHY.indexOf("premium"),
    isCroissanceOrAbove: planIndex >= PLAN_HIERARCHY.indexOf("croissance"),
    isLoading,
    canAccessBooking: planIndex >= PLAN_HIERARCHY.indexOf("local"),
    planLabel: PLAN_LABELS[planCode],
  };
}
