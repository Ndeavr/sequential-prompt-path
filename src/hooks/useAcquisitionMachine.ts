/**
 * Hooks TanStack Query pour l'Acquisition Machine cockpit.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAcquisitionMetrics, fetchTopCities, fetchTopCategories,
  fetchKanbanLeads, moveLeadStage,
  type KanbanStage,
} from "@/services/acquisitionMachineService";

export function useAcquisitionMetrics() {
  return useQuery({
    queryKey: ["acq-metrics"],
    queryFn: fetchAcquisitionMetrics,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcquisitionTopCities() {
  return useQuery({ queryKey: ["acq-top-cities"], queryFn: () => fetchTopCities(8), staleTime: 60_000 });
}

export function useAcquisitionTopCategories() {
  return useQuery({ queryKey: ["acq-top-categories"], queryFn: () => fetchTopCategories(8), staleTime: 60_000 });
}

export function useKanbanLeads() {
  const qc = useQueryClient();

  // realtime — invalide quand pipeline_stage change
  useEffect(() => {
    const ch = supabase
      .channel("acq-kanban-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_leads" }, () => {
        qc.invalidateQueries({ queryKey: ["acq-kanban"] });
        qc.invalidateQueries({ queryKey: ["acq-metrics"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: ["acq-kanban"],
    queryFn: () => fetchKanbanLeads(300),
    staleTime: 10_000,
  });
}

export function useMoveLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: KanbanStage }) => moveLeadStage(leadId, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["acq-kanban"] }),
  });
}
