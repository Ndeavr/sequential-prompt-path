/**
 * UNPRO — Outreach Command Center hooks
 * Live funnel, revenue tracker, template performance, priority queue.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStageRow {
  stage_order: number;
  stage_key: string;
  stage_label: string;
  total: number;
  delta_24h: number;
  delta_7d: number;
}

export interface FirstRevenueSnapshot {
  activations_today: number;
  activations_7d: number;
  activations_30d: number;
  contacted_7d: number;
  contacted_30d: number;
  registrations_7d: number;
  profiles_completed_7d: number;
  paid_plans_active: number;
  last_activation_at: string | null;
  alert_no_activation_48h: boolean;
}

export interface TemplatePerformanceRow {
  template_key: string;
  variant: string;
  sent_count: number;
  delivered_count: number;
  clicked_count: number;
  registered_count: number;
  activated_count: number;
  delivered_rate: number;
  click_rate: number;
  activation_rate: number;
  is_winner: boolean;
  computed_at: string;
}

export interface PriorityProspectRow {
  id: string;
  prospect_id: string;
  total_score: number;
  google_reviews_score: number;
  website_score: number;
  response_score: number;
  territory_score: number;
  score_breakdown: Record<string, unknown>;
  computed_at: string;
  business_name: string | null;
  city: string | null;
  category_slug: string | null;
  phone: string | null;
  website_url: string | null;
  review_count: number | null;
}

export const useOutreachFunnel = () =>
  useQuery({
    queryKey: ["outreach-command-funnel"],
    queryFn: async (): Promise<FunnelStageRow[]> => {
      const { data, error } = await supabase
        .from("v_outreach_command_funnel" as never)
        .select("*")
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FunnelStageRow[];
    },
    refetchInterval: 30_000,
  });

export const useFirstRevenueSnapshot = () =>
  useQuery({
    queryKey: ["first-revenue-snapshot"],
    queryFn: async (): Promise<FirstRevenueSnapshot | null> => {
      const { data, error } = await supabase
        .from("v_first_revenue_snapshot" as never)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as FirstRevenueSnapshot | null;
    },
    refetchInterval: 30_000,
  });

export const useTemplatePerformance = () =>
  useQuery({
    queryKey: ["outreach-template-performance"],
    queryFn: async (): Promise<TemplatePerformanceRow[]> => {
      const { data, error } = await supabase
        .from("v_outreach_template_performance" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as TemplatePerformanceRow[];
    },
    refetchInterval: 60_000,
  });

export const usePriorityQueue = (limit = 100) =>
  useQuery({
    queryKey: ["outreach-priority-queue", limit],
    queryFn: async (): Promise<PriorityProspectRow[]> => {
      const { data: priorityRows, error } = await supabase
        .from("contractor_prospect_priority" as never)
        .select("*")
        .order("total_score", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = (priorityRows ?? []) as unknown as Array<{
        id: string; prospect_id: string; total_score: number;
        google_reviews_score: number; website_score: number;
        response_score: number; territory_score: number;
        score_breakdown: Record<string, unknown>; computed_at: string;
      }>;
      if (rows.length === 0) return [];

      const ids = rows.map(r => r.prospect_id);
      const { data: prospects } = await supabase
        .from("contractor_prospects" as never)
        .select("id, business_name, city, category_slug, phone, website_url, review_count")
        .in("id", ids);

      const byId = new Map(
        ((prospects ?? []) as unknown as Array<{
          id: string; business_name: string | null; city: string | null;
          category_slug: string | null; phone: string | null;
          website_url: string | null; review_count: number | null;
        }>).map(p => [p.id, p]),
      );

      return rows.map(r => ({
        ...r,
        business_name: byId.get(r.prospect_id)?.business_name ?? null,
        city: byId.get(r.prospect_id)?.city ?? null,
        category_slug: byId.get(r.prospect_id)?.category_slug ?? null,
        phone: byId.get(r.prospect_id)?.phone ?? null,
        website_url: byId.get(r.prospect_id)?.website_url ?? null,
        review_count: byId.get(r.prospect_id)?.review_count ?? null,
      }));
    },
    refetchInterval: 60_000,
  });
