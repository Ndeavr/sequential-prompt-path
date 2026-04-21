import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export interface AIPPv2AuditScores {
  score_global: number;
  score_aeo: number;
  score_authority: number;
  score_conversion: number;
  score_local: number;
  score_tech: number;
  revenue_loss_estimate: number;
  score_potential: number;
}

export interface AIPPv2Entity {
  id: string;
  entity_type: string;
  name: string;
  confidence: number;
}

export interface AIPPv2Recommendation {
  id: string;
  title: string;
  description: string;
  priority: string;
  impact_score: number;
}

export interface AIPPv2AuditData {
  audit: { id: string; domain: string; status: string; created_at: string };
  scores: AIPPv2AuditScores | null;
  entities: AIPPv2Entity[];
  recommendations: AIPPv2Recommendation[];
}

export function useAIPPv2Submit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = useCallback(async (domain: string) => {
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: audit, error } = await supabase
        .from("aipp_audits")
        .insert({ domain, user_id: user?.user?.id || null, status: "pending" })
        .select("id")
        .single();

      if (error || !audit) throw new Error("Erreur lors de la création de l'audit");

      supabase.functions.invoke("aipp-v2-analyze", {
        body: { audit_id: audit.id },
      });

      navigate(`/audit-aipp/results/${audit.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate]);

  return { submit, isSubmitting };
}

export function useAIPPv2Results(auditId: string | undefined) {
  const [data, setData] = useState<AIPPv2AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!auditId) return;

    const { data: audit } = await supabase
      .from("aipp_audits")
      .select("*")
      .eq("id", auditId)
      .single();

    if (!audit) return;

    const { data: scores } = await supabase
      .from("aipp_audit_scores")
      .select("*")
      .eq("audit_id", auditId)
      .single();

    const { data: entities } = await supabase
      .from("aipp_audit_entities")
      .select("*")
      .eq("audit_id", auditId);

    const { data: recommendations } = await supabase
      .from("aipp_audit_recommendations")
      .select("*")
      .eq("audit_id", auditId)
      .order("impact_score", { ascending: false });

    setData({
      audit: { id: audit.id, domain: audit.domain, status: audit.status, created_at: audit.created_at },
      scores: scores ? {
        score_global: Number(scores.score_global),
        score_aeo: Number(scores.score_aeo),
        score_authority: Number(scores.score_authority),
        score_conversion: Number(scores.score_conversion),
        score_local: Number(scores.score_local),
        score_tech: Number(scores.score_tech),
        revenue_loss_estimate: Number(scores.revenue_loss_estimate),
        score_potential: Number((scores as any).score_potential ?? 0),
      } : null,
      entities: (entities || []) as AIPPv2Entity[],
      recommendations: (recommendations || []) as AIPPv2Recommendation[],
    });

    setLoading(false);

    if (audit.status === "pending" || audit.status === "processing") {
      setPolling(true);
    } else {
      setPolling(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [polling, fetchData]);

  return { data, loading, isProcessing: polling };
}
