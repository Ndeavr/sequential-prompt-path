/**
 * Compatibility shim for pre-existing AIPP prospects UI.
 * Real acquisition pipeline visibility hook: `useAcquisitionFunnel.ts`.
 */
import { useQuery, useMutation } from "@tanstack/react-query";

export type ProspectWithScore = any;

export function useProspectsWithScores() {
  return useQuery<any[]>({
    queryKey: ["prospects-with-scores-stub"],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

export function useCampagnesAcquisition() {
  return useQuery<any[]>({
    queryKey: ["campagnes-acquisition-stub"],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

export function useProspectDetail(_id: string | null) {
  return useQuery<any>({
    queryKey: ["prospect-detail-stub", _id],
    queryFn: async () => null,
    enabled: !!_id,
  });
}

export function useGenerateAIPPScore() {
  return useMutation<any, Error, any>({ mutationFn: async () => ({ ok: true }) });
}

export function useGenerateEmail() {
  return useMutation<any, Error, any>({ mutationFn: async () => ({ ok: true }) });
}
