import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        console.warn("[useProfile] fetch error", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { salutation?: string; first_name?: string; last_name?: string; full_name?: string; phone?: string; avatar_url?: string }) => {
      const { data, error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
};
