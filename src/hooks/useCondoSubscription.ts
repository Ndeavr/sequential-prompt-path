import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

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

  /** Server maps the tier from the syndicate's door count; no price is sent by the client. */
  const startCheckout = async (syndicateId: string) => {
    const { data, error } = await supabase.functions.invoke("create-condo-checkout", { body: { syndicateId } });
    if (error) {
      let msg = "Le paiement n'a pas pu être préparé. Réessayez.";
      try { const b = await (error as any).context?.json?.(); if (b?.message) msg = b.message; } catch { /* ignore */ }
      throw new Error(msg);
    }
    if (!data?.url) throw new Error("Le paiement n'a pas pu être préparé. Réessayez.");
    redirectToCheckout(data.url);
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
