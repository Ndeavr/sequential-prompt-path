import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useCondoBuilding = (syndicateId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const buildingQuery = useQuery({
    queryKey: ["condo-building", syndicateId],
    queryFn: async () => {
      if (!syndicateId) return null;
      const { data, error } = await supabase
        .from("syndicates")
        .select("*")
        .eq("id", syndicateId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!syndicateId,
  });

  const componentsQuery = useQuery({
    queryKey: ["condo-components", syndicateId],
    queryFn: async () => {
      if (!syndicateId) return [];
      const { data, error } = await supabase
        .from("syndicate_components")
        .select("*")
        .eq("syndicate_id", syndicateId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!syndicateId,
  });

  const maintenanceQuery = useQuery({
    queryKey: ["condo-maintenance", syndicateId],
    queryFn: async () => {
      if (!syndicateId) return [];
      const { data, error } = await supabase
        .from("syndicate_maintenance_tasks")
        .select("*")
        .eq("syndicate_id", syndicateId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!syndicateId,
  });

  const documentsQuery = useQuery({
    queryKey: ["condo-documents", syndicateId],
    queryFn: async () => {
      if (!syndicateId) return [];
      const { data, error } = await supabase
        .from("syndicate_documents")
        .select("*")
        .eq("syndicate_id", syndicateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!syndicateId,
  });

  const addComponent = useMutation({
    mutationFn: async (component: { name: string; category: string; install_year?: number; useful_life_years?: number; estimated_replacement_cost?: number }) => {
      const { error } = await supabase.from("syndicate_components").insert({
        syndicate_id: syndicateId!,
        ...component,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["condo-components", syndicateId] }),
  });

  const addMaintenanceTask = useMutation({
    mutationFn: async (task: { title: string; priority?: string; due_date?: string; category?: string }) => {
      const { error } = await supabase.from("syndicate_maintenance_tasks").insert({
        syndicate_id: syndicateId!,
        ...task,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["condo-maintenance", syndicateId] }),
  });

  return {
    building: buildingQuery.data,
    components: componentsQuery.data ?? [],
    maintenanceTasks: maintenanceQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: buildingQuery.isLoading,
    addComponent,
    addMaintenanceTask,
  };
};
