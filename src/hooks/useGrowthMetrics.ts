/**
 * UNPRO — useGrowthMetrics Hook
 * Admin-facing marketplace growth metrics.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchGrowthMetrics } from "@/services/growthService";

export const useGrowthMetrics = () =>
  useQuery({
    queryKey: ["admin-growth-metrics"],
    queryFn: fetchGrowthMetrics,
    staleTime: 60_000,
  });
