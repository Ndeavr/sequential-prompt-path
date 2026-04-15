import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProspectFilters {
  category_slug?: string;
  city?: string;
  qualification_status?: string;
  outreach_status?: string;
  payment_status?: string;
  search?: string;
}

export function useRecruitmentProspects(filters?: ProspectFilters) {
  const qc = useQueryClient();

  const prospects = useQuery({
    queryKey: ["recruitment-prospects", filters],
    queryFn: async () => {
      let q = supabase.from("contractor_prospects").select("*").order("created_at", { ascending: false }).limit(200);
      if (filters?.category_slug) q = q.eq("category_slug", filters.category_slug);
      if (filters?.city) q = q.eq("city", filters.city);
      if (filters?.qualification_status) q = q.eq("qualification_status", filters.qualification_status);
      if (filters?.outreach_status) q = q.eq("outreach_status", filters.outreach_status);
      if (filters?.payment_status) q = q.eq("payment_status", filters.payment_status);
      if (filters?.search) q = q.ilike("business_name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const scores = useQuery({
    queryKey: ["recruitment-prospect-scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contractor_prospect_scores").select("*").order("final_recruitment_score", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const updateProspect = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("contractor_prospects").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruitment-prospects"] }),
  });

  return { prospects, scores, updateProspect };
}
