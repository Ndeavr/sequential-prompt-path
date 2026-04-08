
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FounderPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  value_total: number;
  duration_years: number;
  max_spots: number;
  spots_remaining: number;
  status: string;
  features: { key: string; label: string }[];
}

export function useFounderPlans() {
  const query = useQuery({
    queryKey: ["founder-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((p) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      })) as FounderPlan[];
    },
  });

  // Realtime subscription for spots_remaining
  useEffect(() => {
    const channel = supabase
      .channel("founder-plans-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "founder_plans" },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return query;
}

export function useFounderCheckout() {
  const checkout = async (planSlug: string, promoCode?: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/create-founder-checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planSlug, promoCode }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Checkout failed");
    }

    const { url } = await res.json();
    window.location.href = url;
  };

  return { checkout };
}
