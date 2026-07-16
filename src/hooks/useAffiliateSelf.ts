/**
 * useAffiliateSelf — resolves the affiliate row for the currently logged-in user.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AffiliateSelf {
  id: string;
  user_id: string | null;
  name: string;
  referral_code: string;
}

export function useAffiliateSelf() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliate-self", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AffiliateSelf | null> => {
      const { data, error } = await (supabase as any)
        .from("affiliates")
        .select("id, user_id, name, referral_code")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as AffiliateSelf) ?? null;
    },
  });
}
