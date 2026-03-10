import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { generateTempAnalysis } from "@/services/tempAnalysisEngine";

export const useQuotes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, properties(address, city), quote_analysis(status, fairness_score)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useQuote = (id: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, properties(address, city)")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });
};

export const useQuoteAnalysis = (quoteId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quote-analysis", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_analysis")
        .select("*")
        .eq("quote_id", quoteId!)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!quoteId && !!user?.id,
  });
};

export const useCreateQuote = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (quote: {
      title: string;
      description?: string;
      amount?: number;
      property_id: string;
      file_url?: string;
    }) => {
      // 1. Create quote
      const { data, error } = await supabase
        .from("quotes")
        .insert({ ...quote, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      // 2. Generate temp analysis and insert
      const analysis = generateTempAnalysis({
        title: data.title,
        description: data.description,
        amount: data.amount,
        file_url: data.file_url,
      });

      const { error: analysisError } = await supabase
        .from("quote_analysis")
        .insert({
          quote_id: data.id,
          status: "completed",
          summary: analysis.summary,
          strengths: analysis.strengths,
          concerns: analysis.concerns,
          missing_items: analysis.missing_items,
          recommendations: analysis.recommendations,
          fairness_score: analysis.fairness_score,
          ai_model: "temp-deterministic-v1",
        });
      if (analysisError) console.error("Analysis creation failed:", analysisError);

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

export const useUploadQuoteFile = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("quote-files").upload(path, file);
      if (error) throw error;
      return path;
    },
  });
};
