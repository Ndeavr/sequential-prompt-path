import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useHomeScores = (propertyId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["home-scores", user?.id, propertyId],
    queryFn: async () => {
      let query = supabase.from("home_scores").select("*, properties(address, city)").eq("user_id", user!.id).order("calculated_at", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
