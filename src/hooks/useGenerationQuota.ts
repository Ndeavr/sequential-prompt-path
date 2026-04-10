/**
 * useGenerationQuota — Hook for checking and consuming generation credits.
 * Integrates with the generation quota edge functions.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type QuotaStatus = "available" | "low" | "exhausted" | "unlimited";

export interface GenerationQuota {
  allowed: boolean;
  isUnlimited: boolean;
  usedCount: number;
  maxGenerations: number | null;
  remaining: number | null;
  planType: string;
  upgradeSoft: boolean;
  upgradeAggressive: boolean;
  status: QuotaStatus;
  requiresAuth: boolean;
}

const DEFAULT_QUOTA: GenerationQuota = {
  allowed: false,
  isUnlimited: false,
  usedCount: 0,
  maxGenerations: 3,
  remaining: 3,
  planType: "decouverte",
  upgradeSoft: false,
  upgradeAggressive: false,
  status: "available",
  requiresAuth: true,
};

function computeStatus(quota: Partial<GenerationQuota>): QuotaStatus {
  if (quota.isUnlimited) return "unlimited";
  if (!quota.remaining || quota.remaining <= 0) return "exhausted";
  if (quota.remaining === 1) return "low";
  return "available";
}

export function useGenerationQuota() {
  const { isAuthenticated } = useAuth();
  const [quota, setQuota] = useState<GenerationQuota>(DEFAULT_QUOTA);
  const [isLoading, setIsLoading] = useState(false);

  const checkQuota = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generation-check-quota", {
        body: { generation_type: "combined_visual" },
      });

      if (error) throw error;

      const q: GenerationQuota = {
        allowed: data.allowed ?? false,
        isUnlimited: data.is_unlimited ?? false,
        usedCount: data.used_count ?? 0,
        maxGenerations: data.max_generations ?? null,
        remaining: data.remaining ?? null,
        planType: data.plan_type ?? "decouverte",
        upgradeSoft: data.upgrade_soft ?? false,
        upgradeAggressive: data.upgrade_aggressive ?? false,
        status: "available",
        requiresAuth: data.requires_auth ?? false,
      };
      q.status = computeStatus(q);
      setQuota(q);
      return q;
    } catch (err) {
      console.error("[useGenerationQuota] check error:", err);
      return quota;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const consumeCredit = useCallback(async (moduleType = "combined_visual") => {
    try {
      const { data, error } = await supabase.functions.invoke("generation-consume-credit", {
        body: { module_type: moduleType },
      });

      if (error) throw error;

      if (data.consumed) {
        // Refresh quota after consumption
        await checkQuota();
        return { success: true, newCount: data.new_count };
      }

      return { success: false, reason: data.reason, quota: data };
    } catch (err) {
      console.error("[useGenerationQuota] consume error:", err);
      return { success: false, reason: "error" };
    }
  }, [checkQuota]);

  // Auto-check on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      checkQuota();
    }
  }, [isAuthenticated]);

  return {
    quota,
    isLoading,
    checkQuota,
    consumeCredit,
  };
}
