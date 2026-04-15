import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentPipelineKPIs() {
  return useQuery({
    queryKey: ["recruitment-pipeline-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_prospects")
        .select("qualification_status, outreach_status, onboarding_status, payment_status, activation_status");
      if (error) throw error;
      const rows = data ?? [];
      return {
        total: rows.length,
        new: rows.filter(r => r.qualification_status === "pending").length,
        qualified: rows.filter(r => r.qualification_status === "qualified").length,
        contacted: rows.filter(r => r.outreach_status === "contacted").length,
        engaged: rows.filter(r => ["replied", "engaged"].includes(r.outreach_status)).length,
        onboarding: rows.filter(r => r.onboarding_status === "in_progress").length,
        paid: rows.filter(r => r.payment_status === "paid").length,
        activated: rows.filter(r => r.activation_status === "active").length,
      };
    },
    staleTime: 30_000,
  });
}

export function useRecruitmentAgentsStatus() {
  return useQuery({
    queryKey: ["recruitment-agents-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_registry")
        .select("agent_key, agent_name, status, domain, tasks_executed, tasks_succeeded, success_rate, updated_at")
        .in("domain", ["recruitment", "outbound", "extraction", "enrichment"])
        .order("agent_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useRecruitmentConversions() {
  return useQuery({
    queryKey: ["recruitment-conversions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_conversions")
        .select("*, contractor_prospects(business_name, city)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOutreachMessageStats() {
  return useQuery({
    queryKey: ["outreach-message-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("message_status, channel_type, sent_at")
        .order("sent_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const rows = data ?? [];
      return {
        total: rows.length,
        sent: rows.filter(r => r.message_status === "sent").length,
        delivered: rows.filter(r => r.message_status === "delivered").length,
        opened: rows.filter(r => r.message_status === "opened").length,
        clicked: rows.filter(r => r.message_status === "clicked").length,
        replied: rows.filter(r => r.message_status === "replied").length,
        bounced: rows.filter(r => r.message_status === "bounced").length,
        byChannel: {
          email: rows.filter(r => r.channel_type === "email").length,
          sms: rows.filter(r => r.channel_type === "sms").length,
        },
      };
    },
    staleTime: 30_000,
  });
}

export function useExtractionMonitor() {
  return useQuery({
    queryKey: ["extraction-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_prospects")
        .select("enrichment_status, source_name, created_at, extraction_confidence")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = data ?? [];
      const sources: Record<string, number> = {};
      rows.forEach(r => {
        const s = r.source_name || "unknown";
        sources[s] = (sources[s] || 0) + 1;
      });
      return {
        total: rows.length,
        pending: rows.filter(r => r.enrichment_status === "pending").length,
        enriched: rows.filter(r => r.enrichment_status === "enriched").length,
        failed: rows.filter(r => r.enrichment_status === "failed").length,
        avgConfidence: rows.reduce((s, r) => s + (r.extraction_confidence || 0), 0) / (rows.length || 1),
        bySources: sources,
      };
    },
    staleTime: 30_000,
  });
}

export function useAIPPScoreDistribution() {
  return useQuery({
    queryKey: ["aipp-score-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_aipp_scores")
        .select("total_score, tier, is_current")
        .eq("is_current", true)
        .limit(500);
      if (error) throw error;
      const rows = data ?? [];
      const tiers: Record<string, number> = {};
      rows.forEach(r => {
        const t = r.tier || "unrated";
        tiers[t] = (tiers[t] || 0) + 1;
      });
      return {
        total: rows.length,
        avgScore: rows.reduce((s, r) => s + (r.total_score || 0), 0) / (rows.length || 1),
        byTier: tiers,
      };
    },
    staleTime: 60_000,
  });
}
