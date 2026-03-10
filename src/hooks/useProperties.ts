import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProperties = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useProperty = (id: string | undefined) => {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateProperty = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (property: { address: string; city?: string; province?: string; postal_code?: string; property_type?: string; year_built?: number; square_footage?: number }) => {
      const { data, error } = await supabase.from("properties").insert({ ...property, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
};

export const useUpdateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; address?: string; city?: string; province?: string; postal_code?: string; property_type?: string; year_built?: number; square_footage?: number }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
};
