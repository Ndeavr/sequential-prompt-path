import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MediaAsset {
  id: string;
  request_prompt: string;
  optimized_prompt: string | null;
  asset_type: string;
  purpose: string;
  target_page: string | null;
  models_used: string[];
  generation_strategy: string;
  variations_count: number;
  storage_path: string | null;
  storage_url: string | null;
  overall_score: number;
  realism_score: number;
  clarity_score: number;
  brand_consistency_score: number;
  composition_score: number;
  aspect_ratio: string;
  file_format: string;
  alt_text: string | null;
  style_preset: string;
  status: string;
  error_message: string | null;
  created_at: string;
  generated_at: string | null;
  approved_at: string | null;
}

export const useMediaOrchestrator = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const assetsQuery = useQuery<MediaAsset[]>({
    queryKey: ["media-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("media-orchestrator", {
        body: { action: "list", limit: 100 },
      });
      if (error) throw error;
      return data.assets ?? [];
    },
    staleTime: 15_000,
  });

  const generateMutation = useMutation({
    mutationFn: async (params: {
      prompt: string;
      purpose?: string;
      aspect_ratio?: string;
      style_preset?: string;
      strategy?: string;
      target_page?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("media-orchestrator", {
        body: { action: "generate", ...params, requested_by: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Asset généré — Score: ${data.score?.overall ?? "?"}/100`);
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
    },
    onError: (e) => toast.error(`Erreur génération: ${e.message}`),
  });

  const approveMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke("media-orchestrator", {
        body: { action: "approve", asset_id: assetId, approved_by: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Asset approuvé");
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke("media-orchestrator", {
        body: { action: "reject", asset_id: assetId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.info("Asset rejeté");
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke("media-orchestrator", {
        body: { action: "regenerate", asset_id: assetId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Asset régénéré avec le modèle premium");
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
    },
  });

  return {
    assets: assetsQuery.data ?? [],
    isLoading: assetsQuery.isLoading,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    regenerate: regenerateMutation.mutate,
    isRegenerating: regenerateMutation.isPending,
  };
};
