/**
 * UNPRO — Hook for appointment pricing data
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAppointmentPricing(contractorId: string | undefined) {
  const calculationsQuery = useQuery({
    queryKey: ["appointment-pricing", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_price_calculations")
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const creditsQuery = useQuery({
    queryKey: ["appointment-credits", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_credits")
        .select("*")
        .eq("contractor_id", contractorId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_pricing_rules")
        .select("*")
        .eq("is_active", true)
        .order("rule_category");
      if (error) throw error;
      return data ?? [];
    },
  });

  const surgeQuery = useQuery({
    queryKey: ["surge-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_surge_events")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    calculations: calculationsQuery.data ?? [],
    credits: creditsQuery.data ?? [],
    rules: rulesQuery.data ?? [],
    surgeEvents: surgeQuery.data ?? [],
    isLoading: calculationsQuery.isLoading || rulesQuery.isLoading,
  };
}
