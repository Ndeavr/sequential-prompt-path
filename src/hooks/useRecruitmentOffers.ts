import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentOffers() {
  const qc = useQueryClient();

  const offers = useQuery({
    queryKey: ["recruitment-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_offers")
        .select("*, contractor_prospects(business_name, city, category_slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createOffer = useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase.from("contractor_recruitment_offers").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-offers"] }),
  });

  const getOfferByToken = async (token: string) => {
    const { data, error } = await supabase
      .from("contractor_recruitment_offers")
      .select("*, contractor_prospects(business_name, city, category_slug, owner_name), recruitment_clusters(name, region_name)")
      .eq("magic_token", token)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  return { offers, createOffer, getOfferByToken };
}
