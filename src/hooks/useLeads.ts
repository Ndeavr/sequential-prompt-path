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

/* ── Admin: demandes propriétaires (public.leads), filtrables par provenance ── */
export type HomeownerLeadSource = "all" | "renovation_calculator" | "alex_chat" | "alex_voice" | "manual";

export const HOMEOWNER_LEAD_SOURCE_LABELS: Record<HomeownerLeadSource, string> = {
  all: "Toutes les provenances",
  renovation_calculator: "Calculateur rénovation",
  alex_chat: "Clara — clavardage",
  alex_voice: "Clara — voix",
  manual: "Formulaire",
};

export interface HomeownerLeadRow {
  id: string;
  city: string | null;
  project_category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: string | null;
  matching_status: string | null;
  created_at: string;
  source: string;
}

export const useHomeownerLeads = (source: HomeownerLeadSource = "all") =>
  useQuery({
    queryKey: ["admin-homeowner-leads", source],
    queryFn: async (): Promise<HomeownerLeadRow[]> => {
      let query = supabase
        .from("leads")
        .select("id, city, project_category, budget_min, budget_max, status, matching_status, created_at, payload")
        .order("created_at", { ascending: false })
        .limit(200);
      if (source !== "all") {
        query = query.filter("payload->>source", "eq", source);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => {
        const payload = (row as { payload?: Record<string, unknown> }).payload ?? {};
        return {
          id: String((row as { id: string }).id),
          city: (row as { city: string | null }).city,
          project_category: (row as { project_category: string | null }).project_category,
          budget_min: (row as { budget_min: number | null }).budget_min,
          budget_max: (row as { budget_max: number | null }).budget_max,
          status: (row as { status: string | null }).status,
          matching_status: (row as { matching_status: string | null }).matching_status,
          created_at: String((row as { created_at: string }).created_at),
          source: typeof payload.source === "string" ? payload.source : "inconnue",
        };
      });
    },
  });
