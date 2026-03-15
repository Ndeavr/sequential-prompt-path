/**
 * UNPRO — useCCAI Hook
 * Manages alignment answer persistence and CCAI computation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { computeCCAI, buildCCAIEngineOutput, type CCAIQuestion, type CCAIAnswer, type CCAIEngineOutput } from "@/services/ccaiEngine";
import { useToast } from "@/hooks/use-toast";

export const useSaveAlignmentAnswers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (answers: { questionId: string; answerCode: string; propertyId?: string; contractorId?: string }[]) => {
      if (!user?.id) throw new Error("Non authentifié");

      // Upsert answers one by one (small set of 25)
      for (const ans of answers) {
        const payload: any = {
          user_id: user.id,
          question_id: ans.questionId,
          answer_code: ans.answerCode,
          source: "questionnaire",
          confidence: 1,
          property_id: ans.propertyId ?? null,
          contractor_id: ans.contractorId ?? null,
        };

        const { error } = await supabase
          .from("profile_alignment_answers")
          .upsert(payload, { onConflict: "user_id,question_id" });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-alignment-answers"] });
      toast({ title: "Réponses sauvegardées", description: "Votre profil de compatibilité a été mis à jour." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder vos réponses.", variant: "destructive" });
    },
  });
};

export const useMyAlignmentAnswers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-alignment-answers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("profile_alignment_answers")
        .select("*, alignment_questions(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
};

export const useContractorAlignmentAnswers = (contractorId?: string) => {
  return useQuery({
    queryKey: ["contractor-alignment-answers", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("profile_alignment_answers")
        .select("*, alignment_questions(*)")
        .eq("contractor_id", contractorId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useCCAIScore = (contractorId?: string) => {
  const { user } = useAuth();
  const { data: myAnswers } = useMyAlignmentAnswers();
  const { data: contractorAnswers } = useContractorAlignmentAnswers(contractorId);
  const { data: questions } = useQuery({
    queryKey: ["alignment-questions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alignment_questions")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const result: CCAIEngineOutput | null = (() => {
    if (!questions?.length || !myAnswers?.length || !contractorAnswers?.length) return null;

    const ccaiQuestions: CCAIQuestion[] = questions.map((q: any) => ({
      id: q.id,
      code: q.code,
      category: q.category,
      question_fr: q.question_fr,
      question_en: q.question_en,
      weight: q.weight ?? 1,
    }));

    const homeAnswers: CCAIAnswer[] = myAnswers.map((a: any) => ({
      questionCode: a.alignment_questions?.code ?? "",
      category: a.alignment_questions?.category ?? "language_communication",
      answerCode: a.answer_code as any,
    }));

    const contAnswers: CCAIAnswer[] = contractorAnswers.map((a: any) => ({
      questionCode: a.alignment_questions?.code ?? "",
      category: a.alignment_questions?.category ?? "language_communication",
      answerCode: a.answer_code as any,
    }));

    const raw = computeCCAI(ccaiQuestions, homeAnswers, contAnswers);
    return buildCCAIEngineOutput(raw);
  })();

  return { result, isReady: !!result };
};
