/**
 * useWarProspects — TanStack Query bindings for WAR Prospecting System.
 * Realtime updates via supabase channel.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WarProspectStatus = "pending" | "approved" | "rejected" | "emailed" | "replied" | "booked";
export type WarCategory = "toiture" | "asphalte" | "gazon" | "peinture";

export interface WarProspect {
  id: string;
  company_name: string;
  category: WarCategory;
  city: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  reviews_count: number;
  facebook_url: string | null;
  instagram_url: string | null;
  lead_score: number;
  status: WarProspectStatus;
  email_subject: string | null;
  email_preview: string | null;
  notes: string | null;
  created_at: string;
  scored_at: string | null;
}

export function useWarProspects(status?: WarProspectStatus, category?: WarCategory) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["war-prospects", status, category],
    queryFn: async () => {
      let q = supabase.from("war_prospects").select("*").order("lead_score", { ascending: false }).limit(500);
      if (status) q = q.eq("status", status);
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as WarProspect[];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("war-prospects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "war_prospects" }, () => {
        qc.invalidateQueries({ queryKey: ["war-prospects"] });
        qc.invalidateQueries({ queryKey: ["war-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status, notes }: { ids: string[]; status: WarProspectStatus; notes?: string }) => {
      const updates: any = { status };
      if (status === "approved") updates.approved_at = new Date().toISOString();
      if (notes) updates.notes = notes;
      const { error } = await supabase.from("war_prospects").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} prospect(s) → ${vars.status}`);
      qc.invalidateQueries({ queryKey: ["war-prospects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateEmail = useMutation({
    mutationFn: async (prospectId: string) => {
      const { data, error } = await supabase.functions.invoke("war-prospecting-engine", {
        body: { action: "generate_email", prospect_id: prospectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Courriel généré");
      qc.invalidateQueries({ queryKey: ["war-prospects"] });
    },
  });

  const runPipeline = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("war-prospecting-engine", {
        body: { action: "run_full_pipeline", city: "Laval" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Pipeline lancé — ${d?.enriched || 0} prospects enrichis`);
      qc.invalidateQueries({ queryKey: ["war-prospects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const launchCampaign = useMutation({
    mutationFn: async (name?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("war-prospecting-engine", {
        body: { action: "launch_campaign", name, user_id: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Campagne lancée — ${d?.sent || 0} courriels envoyés`);
      qc.invalidateQueries({ queryKey: ["war-prospects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { list, updateStatus, generateEmail, runPipeline, launchCampaign };
}

export function useWarStats() {
  return useQuery({
    queryKey: ["war-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("war_prospects").select("status");
      if (error) throw error;
      const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, emailed: 0, replied: 0, booked: 0 };
      data.forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });
      return { counts, total: data.length };
    },
    refetchInterval: 15000,
  });
}
