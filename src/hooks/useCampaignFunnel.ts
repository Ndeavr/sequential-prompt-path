/**
 * UNPRO — Campaign & prospect funnel hooks.
 * Single source of truth: v_campaign_funnel / v_prospect_funnel (Postgres views).
 * No mock data, no client-side derivation of counts.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CampaignFunnelRow = {
  campaign_id: string | null;
  campaign_name: string;
  prospects: number;
  sent: number;
  delivered: number;
  undelivered: number;
  failed: number;
  no_callback: number;
  clicked: number;
  landing: number;
  registered: number;
  otp_verified: number;
  checkout_opened: number;
  paid: number;
  revenue_cents: number;
  first_sent_at: string | null;
  last_activity_at: string | null;
};

export type ProspectFunnelRow = {
  prospect_id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  campaign_id: string | null;
  scraped_at: string | null;
  validated_at: string | null;
  sms_eligibility_tier: string | null;
  outreach_status: string | null;
  sms_sent: number;
  sms_delivered: number;
  sms_undelivered: number;
  sms_failed: number;
  sms_no_callback: number;
  sent_at: string | null;
  last_sid: string | null;
  last_status: string | null;
  last_error: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
  click_count: number;
  landing_at: string | null;
  registered_at: string | null;
  otp_verified_at: string | null;
  checkout_at: string | null;
  paid_at: string | null;
  revenue_cents: number;
  last_activity_at: string | null;
  current_stage: string;
};

export const STAGE_LABELS: Record<string, string> = {
  scraped: "Scrapé",
  validated: "Validé",
  sent: "SMS envoyé",
  send_failed: "Échec d'envoi",
  undelivered: "Non livré",
  delivered: "Livré",
  clicked: "Cliqué",
  landing_viewed: "Page vue",
  registered: "Inscrit",
  otp_verified: "OTP vérifié",
  checkout_opened: "Checkout ouvert",
  paid: "Payé",
};

export function useCampaignFunnel(refreshMs = 10_000) {
  const [rows, setRows] = useState<CampaignFunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("v_campaign_funnel")
      .select("*")
      .order("sent", { ascending: false });
    setRows((data ?? []) as CampaignFunnelRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  return { rows, loading, reload: load };
}

export type ProspectFunnelFilter = {
  stage?: string;
  campaignId?: string | null;
  limit?: number;
};

export function useProspectFunnel(filter: ProspectFunnelFilter = {}, refreshMs = 15_000) {
  const { stage, campaignId, limit = 100 } = filter;
  const [rows, setRows] = useState<ProspectFunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = (supabase as any)
      .from("v_prospect_funnel")
      .select("*")
      .order("last_activity_at", { ascending: false })
      .limit(limit);
    if (stage) q = q.eq("current_stage", stage);
    if (campaignId) q = q.eq("campaign_id", campaignId);
    const { data } = await q;
    setRows((data ?? []) as ProspectFunnelRow[]);
    setLoading(false);
  }, [stage, campaignId, limit]);

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  return { rows, loading, reload: load };
}
