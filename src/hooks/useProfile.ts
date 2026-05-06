import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logBoot, withTimeout } from "@/lib/bootDebug";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      logBoot("PROFILE_FETCH_START", { uid: user?.id });
      try {
        const result = await withTimeout(
          supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
          5000,
          "profile",
        );
        const { data, error } = result as any;
        if (error) {
          logBoot("PROFILE_FETCH_ERROR", { error: error.message });
          return null;
        }
        logBoot("PROFILE_FETCH_OK", { hasProfile: !!data });
        return data;
      } catch (e) {
        logBoot("PROFILE_FETCH_TIMEOUT", { error: String(e) });
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30_000,
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
