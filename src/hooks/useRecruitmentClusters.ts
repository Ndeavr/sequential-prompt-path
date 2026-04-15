import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentClusters() {
  const qc = useQueryClient();

  const clusters = useQuery({
    queryKey: ["recruitment-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_clusters")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const categories = useQuery({
    queryKey: ["recruitment-cluster-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_cluster_categories")
        .select("*, recruitment_clusters(name)")
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const capacityTargets = useQuery({
    queryKey: ["recruitment-capacity-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_capacity_targets")
        .select("*, recruitment_clusters(name)")
        .order("fill_ratio_cached", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stopRules = useQuery({
    queryKey: ["recruitment-stop-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_stop_rules")
        .select("*, recruitment_clusters(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCluster = useMutation({
    mutationFn: async (values: { name: string; region_name?: string; province_code?: string; city_list_json?: any; postal_prefixes_json?: any }) => {
      const { data, error } = await supabase.from("recruitment_clusters").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-clusters"] }),
  });

  const updateCluster = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("recruitment_clusters").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-clusters"] }),
  });

  return { clusters, categories, capacityTargets, stopRules, createCluster, updateCluster };
}
