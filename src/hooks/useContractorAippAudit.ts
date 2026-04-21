import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapAuditToViewModel } from "@/services/aippRealScoringService";
import type { AippAuditViewModel } from "@/types/aippReal";

export function useContractorAippAudit(contractorId: string | undefined) {
  const [model, setModel] = useState<AippAuditViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    if (!contractorId) return;
    try {
      // Get contractor
      const { data: contractor } = await supabase
        .from("contractors").select("id, business_name, website, phone, email, city, rbq_number, neq, google_business_url, rating, review_count, legal_name")
        .eq("id", contractorId).single();

      if (!contractor) { setError("Contractor not found"); setLoading(false); return; }

      // Get latest audit
      const { data: audits } = await supabase
        .from("contractor_aipp_audits").select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false }).limit(1);

      const audit = audits?.[0] || null;

      // Get job if audit exists
      let job = null;
      if (audit) {
        const { data: jobs } = await supabase
          .from("contractor_aipp_jobs").select("*")
          .eq("audit_id", audit.id).limit(1);
        job = jobs?.[0] || null;
      }

      setModel(mapAuditToViewModel(audit, contractor, job));
      setLoading(false);

      // Return status for polling
      return audit?.analysis_status;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let mounted = true;

    const poll = async () => {
      const status = await fetchLatest();
      if (mounted && (status === "running" || status === "pending")) {
        interval = setInterval(async () => {
          const s = await fetchLatest();
          if (s !== "running" && s !== "pending") clearInterval(interval);
        }, 3000);
      }
    };

    poll();
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchLatest]);

  return { model, loading, error, refetch: fetchLatest };
}

export function useLaunchAippAudit() {
  const [launching, setLaunching] = useState(false);

  const launch = async (contractorId: string) => {
    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("aipp-run-audit", {
        body: { contractor_id: contractorId },
      });
      if (error) throw error;
      return data;
    } finally {
      setLaunching(false);
    }
  };

  return { launch, launching };
}
