import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, contractors, properties, quotes, reviews] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contractors").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: profiles.count ?? 0,
        contractors: contractors.count ?? 0,
        properties: properties.count ?? 0,
        quotes: quotes.count ?? 0,
        reviews: reviews.count ?? 0,
      };
    },
  });
};

export const useAdminUsers = () => useQuery({
  queryKey: ["admin-users"],
  queryFn: async () => {
    // Fetch profiles and roles separately, then merge (FK now exists)
    const { data: profiles, error } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return profiles;
  },
});

export const useAdminContractors = () => useQuery({
  queryKey: ["admin-contractors"],
  queryFn: async () => {
    const { data, error } = await supabase.from("contractors").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});

export const useAdminQuotes = () => useQuery({
  queryKey: ["admin-quotes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});

export const useAdminReviews = () => useQuery({
  queryKey: ["admin-reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("reviews").select("*, contractors(business_name)").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});

export const useAdminDocuments = () => useQuery({
  queryKey: ["admin-documents"],
  queryFn: async () => {
    const { data, error } = await supabase.from("storage_documents").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});
