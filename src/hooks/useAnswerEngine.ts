import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StructuredAnswer {
  question: string;
  short_answer: string;
  explanation: string;
  causes: string[];
  solutions: string[];
  cost_min?: number;
  cost_max?: number;
  recommended_professionals: string[];
  urgency: "low" | "medium" | "high" | "emergency";
  preventive_advice: string[];
  follow_up_question: string;
  related_questions: string[];
  confidence_score: number;
  property_type_relevance?: string;
  next_actions?: { label: string; action_type: string }[];
  source: "ai" | "template";
}

export function useAskQuestion() {
  const [isStreaming, setIsStreaming] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      question,
      mode = "search",
      property_type,
      city,
      user_name,
    }: {
      question: string;
      mode?: "alex" | "seo" | "search" | "diagnostic" | "api";
      property_type?: string;
      city?: string;
      user_name?: string;
    }): Promise<StructuredAnswer> => {
      setIsStreaming(true);
      const { data, error } = await supabase.functions.invoke("answer-engine", {
        body: { question, mode, property_type, city, user_name },
      });
      setIsStreaming(false);
      if (error) throw error;
      return data as StructuredAnswer;
    },
  });

  return { ...mutation, isStreaming };
}

export function useAnswerTemplates() {
  return useQuery({
    queryKey: ["answer-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answer_templates")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAnswerLogs(limit = 50) {
  return useQuery({
    queryKey: ["answer-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answer_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await supabase
        .from("answer_templates")
        .upsert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["answer-templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("answer_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["answer-templates"] }),
  });
}
