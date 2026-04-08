import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useCondoSubscription = () => {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["condo-subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-condo-subscription");
      if (error) throw error;
      return data as {
        subscribed: boolean;
        plan_tier: string;
        product_id: string | null;
        subscription_end: string | null;
      };
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const startCheckout = async (priceId: string, syndicateId?: string) => {
    const { data, error } = await supabase.functions.invoke("create-condo-checkout", {
      body: { priceId, syndicateId },
    });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  return {
    isPremium: data?.subscribed ?? false,
    planTier: data?.plan_tier ?? "free",
    subscriptionEnd: data?.subscription_end,
    isLoading,
    refetch,
    startCheckout,
  };
};
