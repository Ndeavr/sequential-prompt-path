import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";

export interface ContractorSubscription {
  id: string;
  contractor_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export const useContractorSubscription = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["contractor-subscription", contractor?.id],
    queryFn: async () => {
      if (!contractor?.id) return null;
      const { data, error } = await supabase
        .from("contractor_subscriptions")
        .select("*")
        .eq("contractor_id", contractor.id)
        .maybeSingle();
      if (error) throw error;
      return data as ContractorSubscription | null;
    },
    enabled: !!contractor?.id,
  });
};

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async ({
      priceId,
      planId,
    }: {
      priceId: string;
      planId: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId,
            planId,
            successUrl: `${window.location.origin}/pro/billing?success=true`,
            cancelUrl: `${window.location.origin}/pro/billing?canceled=true`,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Checkout failed");
      }

      return res.json();
    },
  });
};

export const useCreateBillingPortal = () => {
  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-billing-portal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/pro/billing`,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Portal failed");
      }

      return res.json();
    },
  });
};

export const useHasActiveSubscription = (): {
  hasActive: boolean;
  isLoading: boolean;
  planId: string | null;
} => {
  const { data: sub, isLoading } = useContractorSubscription();
  const activeStatuses = ["active", "trialing"];
  const hasActive = !!sub && activeStatuses.includes(sub.status);
  return { hasActive, isLoading, planId: sub?.plan_id ?? null };
};
