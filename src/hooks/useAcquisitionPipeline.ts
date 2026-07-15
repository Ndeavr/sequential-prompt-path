/**
 * Compatibility shim for pre-existing AIPP prospects UI.
 * The real acquisition-pipeline visibility hook now lives in `useAcquisitionFunnel.ts`.
 * These stubs keep the AIPP prospects page compiling without disturbing that feature.
 */
import { useQuery, useMutation } from "@tanstack/react-query";

export type ProspectWithScore = {
  id: string;
  business_name?: string | null;
  status?: string | null;
  score?: {
    score_visibilite: number;
    score_conversion: number;
    score_confiance: number;
  } | null;
};

export function useProspectsWithScores() {
  return useQuery({
    queryKey: ["prospects-with-scores-stub"],
    queryFn: async () => [] as ProspectWithScore[],
    staleTime: Infinity,
  });
}

export function useCampagnesAcquisition() {
  return useQuery({
    queryKey: ["campagnes-acquisition-stub"],
    queryFn: async () => [] as any[],
    staleTime: Infinity,
  });
}

export function useProspectDetail(_id: string | null) {
  return useQuery({
    queryKey: ["prospect-detail-stub", _id],
    queryFn: async () =>
      null as null | {
        prospect?: { business_name?: string | null };
        score?: { score_visibilite: number; score_conversion: number; score_confiance: number };
        screenshots?: any[];
        emails?: Array<{ sujet: string; statut: string; etape: number; langue: string }>;
        sms?: Array<{ statut: string; message: string }>;
      },
    enabled: !!_id,
  });
}

export function useGenerateAIPPScore() {
  return useMutation({ mutationFn: async (_id: string) => ({ ok: true }) });
}

export function useGenerateEmail() {
  return useMutation({ mutationFn: async (_id: string) => ({ ok: true }) });
}
