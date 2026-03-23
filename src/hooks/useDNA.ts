/**
 * UNPRO — useDNA hooks
 * Fetches and saves DNA profiles for homeowners and contractors.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  buildHomeownerDNAFromCCAI,
  buildContractorDNAFromCCAI,
  computeDNAFit,
  type DNAProfile,
} from "@/services/dnaEngine";
import type { CCAIAnswer } from "@/services/ccaiEngine";
import { useToast } from "@/hooks/use-toast";

export const useHomeownerDNA = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["homeowner-dna", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("homeowner_dna_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useContractorDNA = (contractorId?: string) => {
  return useQuery({
    queryKey: ["contractor-dna", contractorId],
    queryFn: async () => {
      if (!contractorId) return null;
      const { data, error } = await supabase
        .from("contractor_dna_profiles")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
};

export const useDNAFitResult = (contractorId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dna-fit", user?.id, contractorId],
    queryFn: async () => {
      if (!user?.id || !contractorId) return null;
      const { data, error } = await supabase
        .from("dna_fit_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!contractorId,
  });
};

export const useGenerateHomeownerDNA = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (answers: CCAIAnswer[]) => {
      if (!user?.id) throw new Error("Non authentifié");

      const dna = buildHomeownerDNAFromCCAI(answers);

      const { error } = await supabase.from("homeowner_dna_profiles").upsert(
        {
          user_id: user.id,
          dna_type: dna.dnaType,
          dna_label_fr: dna.dnaLabelFr,
          dna_label_en: dna.dnaLabelEn,
          traits: dna.traits as any,
          confidence: dna.confidence,
          generated_by: "ccai_derivation",
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      return dna;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homeowner-dna"] });
      toast({ title: "Profil ADN généré", description: "Votre profil comportemental a été créé." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de générer votre profil ADN.", variant: "destructive" });
    },
  });
};

export const useComputeDNAFit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      homeownerDNA,
      contractorDNA,
      contractorId,
    }: {
      homeownerDNA: DNAProfile;
      contractorDNA: DNAProfile;
      contractorId: string;
    }) => {
      if (!user?.id) throw new Error("Non authentifié");

      const fit = computeDNAFit(homeownerDNA, contractorDNA);

      const { error } = await supabase.from("dna_fit_results").upsert(
        {
          user_id: user.id,
          contractor_id: contractorId,
          homeowner_dna_type: fit.homeownerType,
          contractor_dna_type: fit.contractorType,
          dna_fit_score: fit.dnaFitScore,
          compatibility_label: fit.compatibilityLabel,
          matching_traits: fit.matchingTraitsFr as any,
          watchout_traits: fit.watchoutTraitsFr as any,
          explanation_fr: fit.explanationFr as any,
        },
        { onConflict: "user_id,contractor_id" }
      );
      if (error) throw error;
      return fit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dna-fit"] });
    },
  });
};
