import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/* ── Contractor: list leads with qualification data ── */
export const useContractorLeads = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-leads", user?.id],
    queryFn: async () => {
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!contractor) return [];

      const { data, error } = await supabase
        .from("lead_qualifications")
        .select("*, appointments(id, status, preferred_date, preferred_time_window, notes, contact_preference, project_category, urgency_level, budget_range, timeline, created_at, properties(address, city))")
        .eq("contractor_id", contractor.id)
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

/* ── Contractor: single lead detail ── */
export const useLead = (id: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_qualifications")
        .select("*, appointments(id, status, preferred_date, preferred_time_window, notes, contact_preference, project_category, urgency_level, budget_range, timeline, created_at, properties(address, city))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });
};

/* ── Admin: all leads ── */
export const useAdminLeads = () =>
  useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_qualifications")
        .select("*, appointments(status, preferred_date, created_at), contractors(business_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

/* ── Admin: lead stats ── */
export const useAdminLeadStats = () =>
  useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_qualifications")
        .select("score, created_at");
      if (error) throw error;
      const all = data ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const todayLeads = all.filter((l) => l.created_at.slice(0, 10) === today);
      const highQuality = all.filter((l) => l.score >= 60);
      const avgScore = all.length ? Math.round(all.reduce((s, l) => s + l.score, 0) / all.length) : 0;
      return {
        total: all.length,
        today: todayLeads.length,
        highQuality: highQuality.length,
        avgScore,
      };
    },
  });
