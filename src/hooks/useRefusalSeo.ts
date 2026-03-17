/**
 * UNPRO — Refusal SEO Hooks
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRefusalSignals,
  fetchRefusalSeoPages,
  fetchRefusalSeoPageBySlug,
  updateRefusalSeoPageStatus,
  getRefusalSeoStats,
} from "@/services/refusalSeoEngine";
import { useToast } from "@/hooks/use-toast";

export function useRefusalSignals(ungeneratedOnly = false) {
  return useQuery({
    queryKey: ["refusal-signals", ungeneratedOnly],
    queryFn: () => fetchRefusalSignals({ ungeneratedOnly, limit: 200 }),
  });
}

export function useRefusalSeoPages(status?: string) {
  return useQuery({
    queryKey: ["refusal-seo-pages", status],
    queryFn: () => fetchRefusalSeoPages({ status, limit: 100 }),
  });
}

export function useRefusalSeoPage(slug: string) {
  return useQuery({
    queryKey: ["refusal-seo-page", slug],
    queryFn: () => fetchRefusalSeoPageBySlug(slug),
    enabled: !!slug,
  });
}

export function useRefusalSeoStats() {
  return useQuery({
    queryKey: ["refusal-seo-stats"],
    queryFn: getRefusalSeoStats,
  });
}

export function useUpdateRefusalPageStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateRefusalSeoPageStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["refusal-seo-pages"] });
      qc.invalidateQueries({ queryKey: ["refusal-seo-stats"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut", variant: "destructive" });
    },
  });
}
