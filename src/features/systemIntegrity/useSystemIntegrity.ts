/**
 * useSystemIntegrity — Realtime hook for /admin/system-integrity.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PipelineHealth {
  score: number;
  weight: number;
  status: "healthy" | "degraded" | "down";
}

export interface SystemHealthScore {
  overall_score: number | null;
  status: "healthy" | "degraded" | "down" | null;
  pipeline_scores: Record<string, PipelineHealth> | null;
}

export interface FirstPaidFunnel {
  prospect_identified_at: string | null;
  sms_delivered_at: string | null;
  clicked_at: string | null;
  account_created_at: string | null;
  payment_at: string | null;
  activated_at: string | null;
  first_match_at: string | null;
  first_booking_at: string | null;
}

async function fetchScore(): Promise<SystemHealthScore> {
  const { data } = await (supabase as any).from("v_system_health_score").select("*").maybeSingle();
  return (data ?? { overall_score: null, status: null, pipeline_scores: null }) as SystemHealthScore;
}

async function fetchPipeline(view: string) {
  const { data } = await (supabase as any).from(view).select("*").maybeSingle();
  return data ?? {};
}

async function fetchFunnel(): Promise<FirstPaidFunnel> {
  const { data } = await (supabase as any).from("v_first_paid_contractor_funnel").select("*").maybeSingle();
  return (data ?? {}) as FirstPaidFunnel;
}

async function fetchRepairs() {
  const { data } = await (supabase as any)
    .from("auto_repair_attempts")
    .select("*")
    .order("attempted_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export function useSystemIntegrity() {
  const qc = useQueryClient();

  const score = useQuery({ queryKey: ["integrity-score"], queryFn: fetchScore, refetchInterval: 30_000 });
  const scraping = useQuery({ queryKey: ["integrity-scraping"], queryFn: () => fetchPipeline("v_pipeline_scraping_health"), refetchInterval: 30_000 });
  const sms = useQuery({ queryKey: ["integrity-sms"], queryFn: () => fetchPipeline("v_pipeline_sms_health"), refetchInterval: 30_000 });
  const email = useQuery({ queryKey: ["integrity-email"], queryFn: () => fetchPipeline("v_pipeline_email_health"), refetchInterval: 30_000 });
  const onboarding = useQuery({ queryKey: ["integrity-onboarding"], queryFn: () => fetchPipeline("v_pipeline_onboarding_health"), refetchInterval: 30_000 });
  const stripe = useQuery({ queryKey: ["integrity-stripe"], queryFn: () => fetchPipeline("v_pipeline_stripe_health"), refetchInterval: 30_000 });
  const matching = useQuery({ queryKey: ["integrity-matching"], queryFn: () => fetchPipeline("v_pipeline_matching_health"), refetchInterval: 30_000 });
  const funnel = useQuery({ queryKey: ["integrity-funnel"], queryFn: fetchFunnel, refetchInterval: 60_000 });
  const repairs = useQuery({ queryKey: ["integrity-repairs"], queryFn: fetchRepairs, refetchInterval: 60_000 });

  useEffect(() => {
    const channel = supabase
      .channel("integrity-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_operation_outcomes" }, () => {
        qc.invalidateQueries({ queryKey: ["integrity-score"] });
        qc.invalidateQueries({ queryKey: ["integrity-funnel"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auto_repair_attempts" }, () => {
        qc.invalidateQueries({ queryKey: ["integrity-repairs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const runSnapshot = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-integrity-snapshot", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Instantané d'intégrité capturé");
      qc.invalidateQueries({ queryKey: ["integrity-score"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur snapshot"),
  });

  const runRepair = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-repair-tick", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vérification auto-repair lancée");
      qc.invalidateQueries({ queryKey: ["integrity-repairs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur auto-repair"),
  });

  return { score, scraping, sms, email, onboarding, stripe, matching, funnel, repairs, runSnapshot, runRepair };
}
