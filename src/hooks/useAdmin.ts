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
    // Separate queries — no FK between user_roles and profiles
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (rolesRes.error) throw rolesRes.error;

    const rolesByUser = (rolesRes.data ?? []).reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.user_id] ??= []).push(r.role);
      return acc;
    }, {});

    return (profilesRes.data ?? []).map((p) => ({
      ...p,
      roles: rolesByUser[p.user_id] ?? [],
    }));
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
