/**
 * Hook — Acquisition Pipeline dashboard data.
 * Reads funnel events, coverage, rejection reasons, live prospect list.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FunnelRow = {
  stage: string;
  source: string;
  city: string;
  category: string;
  count: number;
};

export type CoverageRow = {
  city: string;
  category: string;
  verified_count: number;
  ready_count: number;
  contacted_count: number;
  total_count: number;
};

export type RejectionRow = {
  reason_code: string;
  sample_reason_text: string | null;
  count: number;
};

export type PipelineEvent = {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  source: string | null;
  stage: string;
  reason_code: string | null;
  reason_text: string | null;
  created_at: string;
};

export type PipelineProspect = {
  id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  source: string | null;
  data_quality_score: number | null;
  verification_status: string | null;
  outreach_status: string | null;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  last_action_at: string | null;
  updated_at: string;
};

export type SourceHealthRow = {
  source: string;
  status: "healthy" | "degraded" | "scraper_down" | "fallback_running";
  display_status: string;
  is_down: boolean;
  last_run_at: string | null;
  last_success_at: string | null;
  found_last_run: number;
  found_24h: number;
  consecutive_zero_runs: number;
  last_error_code: string | null;
  last_error_message: string | null;
  fallback_started_at: string | null;
};

export type DiagnosticsFunnelRow = {
  step_key: string;
  label: string;
  sort_order: number;
  count: number;
  previous_count: number | null;
  conversion_from_previous_pct: number | null;
};

export type DeadQueueAlertRow = {
  id: string;
  prospect_id: string | null;
  alert_type: string;
  status: string;
  root_cause: string;
  reason: string | null;
  queue_state: string | null;
  detected_at: string;
  repair_attempts: number;
};

export type FirstDollarTrackerRow = {
  run_started_at: string | null;
  first_sms_sent_at: string | null;
  first_delivery_at: string | null;
  first_click_at: string | null;
  first_activation_at: string | null;
  first_paid_at: string | null;
  first_appointment_at: string | null;
  next_missing_milestone: string;
  telemetry_warning: string | null;
};

export type DailyAuditRow = {
  id: string;
  audit_date: string;
  status: string;
  health_score: number;
  root_causes: Array<Record<string, unknown>>;
  recovery_actions: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  completed_at: string | null;
  error: string | null;
};

const REFRESH_MS = 15_000;

export function useFunnelDaily() {
  return useQuery({
    queryKey: ["acq-funnel-daily"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_funnel_daily")
        .select("*");
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
  });
}

export function useAcquisitionSourceHealth() {
  return useQuery({
    queryKey: ["acq-source-health"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_source_health")
        .select("*")
        .order("source", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SourceHealthRow[];
    },
  });
}

export function useAcquisitionDiagnosticsFunnel() {
  return useQuery({
    queryKey: ["acq-diagnostics-funnel"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_diagnostics_funnel")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DiagnosticsFunnelRow[];
    },
  });
}

export function useAcquisitionDeadQueueAlerts() {
  return useQuery({
    queryKey: ["acq-dead-queue-alerts"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("acquisition_dead_queue_alerts")
        .select("id,prospect_id,alert_type,status,root_cause,reason,queue_state,detected_at,repair_attempts")
        .in("status", ["open", "repairing"])
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DeadQueueAlertRow[];
    },
  });
}

export function useFirstDollarTracker() {
  return useQuery({
    queryKey: ["first-dollar-tracker"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_first_dollar_tracker")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as FirstDollarTrackerRow | null;
    },
  });
}

export function useLatestAcquisitionAudit() {
  return useQuery({
    queryKey: ["latest-acquisition-audit"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("acquisition_daily_audits")
        .select("id,audit_date,status,health_score,root_causes,recovery_actions,metrics,completed_at,error")
        .order("audit_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DailyAuditRow | null;
    },
  });
}

export function useRunDailyAcquisitionAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("daily-acquisition-audit", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latest-acquisition-audit"] });
      qc.invalidateQueries({ queryKey: ["acq-diagnostics-funnel"] });
      qc.invalidateQueries({ queryKey: ["first-dollar-tracker"] });
    },
  });
}

export function useImportContractors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, auto_send = true }: { rows: Array<Record<string, unknown>>; auto_send?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("import-contractors", { body: { rows, auto_send } });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acq-source-health"] });
      qc.invalidateQueries({ queryKey: ["acq-diagnostics-funnel"] });
      qc.invalidateQueries({ queryKey: ["acq-coverage"] });
      qc.invalidateQueries({ queryKey: ["acq-recent-events"] });
      qc.invalidateQueries({ queryKey: ["first-dollar-tracker"] });
    },
  });
}

export function useCoverage() {
  return useQuery({
    queryKey: ["acq-coverage"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_coverage")
        .select("*");
      if (error) throw error;
      return (data ?? []) as CoverageRow[];
    },
  });
}

export function useRejectionReasons() {
  return useQuery({
    queryKey: ["acq-rejection-reasons"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_acquisition_rejection_reasons")
        .select("*")
        .limit(10);
      if (error) throw error;
      return (data ?? []) as RejectionRow[];
    },
  });
}

export function useRecentEvents(limit = 50) {
  return useQuery({
    queryKey: ["acq-recent-events", limit],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("acquisition_pipeline_events")
        .select("id,business_name,city,category,source,stage,reason_code,reason_text,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PipelineEvent[];
    },
  });
}

export function usePipelineProspects(filters: {
  stage?: string;
  source?: string;
  city?: string;
  category?: string;
  reason?: string;
} = {}) {
  return useQuery({
    queryKey: ["acq-pipeline-prospects", filters],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      let q = (supabase as any)
        .from("verified_contractor_prospects")
        .select(
          "id,business_name,city,category,phone_e164,email,source,data_quality_score,verification_status,outreach_status,rejection_reason_code,rejection_reason_text,last_action_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (filters.source) q = q.eq("source", filters.source);
      if (filters.city) q = q.eq("city", filters.city);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.reason) q = q.eq("rejection_reason_code", filters.reason);
      if (filters.stage === "rejected") q = q.not("rejection_reason_code", "is", null);
      if (filters.stage === "verified") q = q.eq("verification_status", "verified");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PipelineProspect[];
    },
  });
}
