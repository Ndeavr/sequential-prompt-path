import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentPayments() {
  const payments = useQuery({
    queryKey: ["recruitment-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_payments")
        .select("*, contractor_prospects(business_name, city, category_slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const checkoutSessions = useQuery({
    queryKey: ["recruitment-checkout-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_checkout_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const conversions = useQuery({
    queryKey: ["recruitment-conversions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_conversions")
        .select("*, contractor_prospects(business_name, city, category_slug)")
        .order("converted_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return { payments, checkoutSessions, conversions };
}
