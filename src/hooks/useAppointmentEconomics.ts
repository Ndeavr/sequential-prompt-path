/**
 * UNPRO — Appointment Economics Hooks
 * Live Supabase data for plan quotas, pricing, usage.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlanCode, ProjectSizeCode } from "@/services/appointmentEconomicsEngine";

// ── Plan Definitions ──
export function usePlanDefinitions() {
  return useQuery({
    queryKey: ["plan-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_definitions")
        .select("*")
        .eq("is_active", true)
        .order("rank");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Plan Included Appointments ──
export function usePlanIncludedAppointments() {
  return useQuery({
    queryKey: ["plan-included-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_included_appointments")
        .select("*")
        .order("included_appointments_monthly");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Project Sizes ──
export function useProjectSizes() {
  return useQuery({
    queryKey: ["project-sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sizes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Plan × Project Size Access ──
export function usePlanProjectSizeAccess() {
  return useQuery({
    queryKey: ["plan-project-size-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_project_size_included_appointments")
        .select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Extra Appointment Pricing Rules ──
export function useExtraPricingRules() {
  return useQuery({
    queryKey: ["extra-pricing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_appointment_pricing_rules")
        .select("*")
        .eq("is_active", true)
        .order("plan_code,project_size_code");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Entrepreneur Plan Usage (for a specific contractor) ──
export function useEntrepreneurUsage(contractorId?: string) {
  return useQuery({
    queryKey: ["entrepreneur-usage", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("entrepreneur_plan_usage")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("billing_cycle_start", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
    staleTime: 30_000,
  });
}

// ── Entrepreneur Extra Appointments ──
export function useEntrepreneurExtras(contractorId?: string) {
  return useQuery({
    queryKey: ["entrepreneur-extras", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("entrepreneur_extra_appointments")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
    staleTime: 30_000,
  });
}

// ── Monthly Summaries ──
export function useMonthlySummaries(contractorId?: string) {
  return useQuery({
    queryKey: ["monthly-summaries", contractorId],
    queryFn: async () => {
      let query = supabase
        .from("entrepreneur_monthly_appointment_summary")
        .select("*")
        .order("billing_month", { ascending: false })
        .limit(24);
      if (contractorId) query = query.eq("contractor_id", contractorId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

// ── All Usage (Admin) ──
export function useAllEntrepreneurUsage() {
  return useQuery({
    queryKey: ["all-entrepreneur-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrepreneur_plan_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

// ── Compute helpers ──

export function getUpgradeBreakEven(
  plans: { code: string; base_price_monthly: number; rank: number }[],
  currentPlanCode: string,
  currentOverage: number
) {
  const current = plans.find(p => p.code === currentPlanCode);
  if (!current) return null;
  const next = plans.find(p => p.rank === current.rank + 1);
  if (!next) return null;

  const diff = (next.base_price_monthly - current.base_price_monthly) / 100;
  const shouldRecommend = currentOverage >= diff * 0.85;

  const messages: Record<string, string> = {
    pro: "Vous payez presque l'équivalent du plan Pro en rendez-vous extra",
    premium: "Passez Premium pour inclure plus de rendez-vous et accéder aux projets L",
    elite: "Votre volume XL justifie un passage Élite",
    signature: "Passez Signature pour un accès illimité à toutes les tailles",
  };

  return {
    current_plan: currentPlanCode,
    next_plan: next.code,
    price_difference: diff,
    current_overage: currentOverage,
    should_recommend: shouldRecommend,
    savings_if_upgrade: currentOverage - diff,
    message: messages[next.code] || `Passez ${next.code} pour économiser`,
  };
}
