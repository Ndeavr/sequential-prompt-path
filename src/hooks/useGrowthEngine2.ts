/**
 * UNPRO — Autonomous Growth Engine Hooks
 * React Query bindings for the growth flywheel dashboard.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchGrowthDashboard,
  fetchFlywheelStatus,
  fetchRecentGrowthEvents,
  fetchPendingGrowthEvents,
  fetchGrowthMetrics,
  triggerContentExpansion,
  triggerCityExpansion,
  triggerTransformationDiscovery,
  triggerTrafficAnalysis,
  triggerTransformationPromotion,
  approveGrowthEvent,
  rejectGrowthEvent,
} from "@/services/growthEngineService";

const STALE = 30_000;

export const useGrowthDashboard = () =>
  useQuery({ queryKey: ["growth-dashboard"], queryFn: fetchGrowthDashboard, staleTime: STALE });

export const useFlywheelStatus = () =>
  useQuery({ queryKey: ["flywheel-status"], queryFn: fetchFlywheelStatus, staleTime: STALE });

export const useRecentGrowthEvents = (limit = 30) =>
  useQuery({ queryKey: ["growth-events-recent", limit], queryFn: () => fetchRecentGrowthEvents(limit), staleTime: STALE });

export const usePendingGrowthEvents = () =>
  useQuery({ queryKey: ["growth-events-pending"], queryFn: fetchPendingGrowthEvents, staleTime: 15_000 });

export const useGrowthMetricsHistory = (days = 30) =>
  useQuery({ queryKey: ["growth-metrics-history", days], queryFn: () => fetchGrowthMetrics(days), staleTime: 60_000 });

// ─── Mutations ───────────────────────────────────────────────────
function useGrowthMutation<T>(
  mutationFn: () => Promise<T>,
  successMsg: string,
  invalidateKeys: string[]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(successMsg);
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });
}

export const useExpandContent = () =>
  useGrowthMutation(
    () => triggerContentExpansion(20),
    "Contenu généré avec succès",
    ["growth-dashboard", "growth-events-recent", "growth-events-pending"]
  );

export const useExpandCities = () =>
  useGrowthMutation(
    () => triggerCityExpansion(),
    "Expansion géographique lancée",
    ["growth-dashboard", "growth-events-recent"]
  );

export const useDiscoverTransformations = () =>
  useGrowthMutation(
    () => triggerTransformationDiscovery(),
    "Transformations découvertes",
    ["growth-dashboard", "growth-events-recent", "growth-events-pending"]
  );

export const useAnalyzeTraffic = () =>
  useGrowthMutation(
    () => triggerTrafficAnalysis(),
    "Analyse du trafic terminée",
    ["growth-dashboard", "growth-metrics-history"]
  );

export const usePromoteTransformations = () =>
  useGrowthMutation(
    () => triggerTransformationPromotion(),
    "Transformations promues",
    ["growth-dashboard", "growth-events-recent"]
  );

export const useApproveGrowthEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      approveGrowthEvent(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["growth-events-pending"] });
      qc.invalidateQueries({ queryKey: ["growth-events-recent"] });
      toast.success("Événement approuvé");
    },
  });
};

export const useRejectGrowthEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      rejectGrowthEvent(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["growth-events-pending"] });
      qc.invalidateQueries({ queryKey: ["growth-events-recent"] });
      toast.success("Événement rejeté");
    },
  });
};
