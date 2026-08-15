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
  first_name: string | null;
  referral_code: string;
  slug: string | null;
  status: string | null;
  parent_affiliate_id: string | null;
  parent_assigned_at: string | null;
}

export function useAffiliateSelf() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliate-self", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AffiliateSelf | null> => {
      const { data, error } = await (supabase as any)
        .from("affiliates")
        .select("id, user_id, name, first_name, referral_code, slug, status, parent_affiliate_id, parent_assigned_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as AffiliateSelf) ?? null;
    },
  });
}
