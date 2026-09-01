/**
 * Mode Action affilié — hooks de données.
 * Tout provient de données réelles : contractor_leads, affiliate_lead_events,
 * ai_recommendation_audits, affiliate_conversions. Rien n'est inventé.
 */
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackAffiliateFunnel } from "@/features/affiliate/onboarding/trackAffiliateFunnel";

export interface ActionProspect {
  id: string;
  company_name: string | null;
  business_name: string | null;
  first_name: string | null;
  full_name: string | null;
  role_title: string | null;
  city: string | null;
  category_primary: string | null;
  trade: string | null;
  phone_e164: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  contact_status: string | null;
  next_follow_up_at: string | null;
}

export interface ActionAudit {
  id: string;
  invite_token: string | null;
  channel: string | null;
  sent_at: string | null;
  opened_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  claimed_at?: string | null;
  status?: string | null;
}

export type NextProspectResult = {
  prospect: ActionProspect | null;
  audit: ActionAudit | null;
  remaining?: number;
  reason?: string;
  total_assigned?: number;
};

export function useNextProspect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (payload: Record<string, unknown>): Promise<NextProspectResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("affiliate-next-prospect", { body: payload });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const result = data as NextProspectResult;
        if (result?.prospect && payload.action === "next") {
          trackAffiliateFunnel("first_prospect_viewed", { metadata: { lead_id: result.prospect.id } });
        }
        return result;
      } catch (e: any) {
        setError(e?.message ?? "Impossible de charger un prospect.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    next: (excludeLeadId?: string | null) => call({ action: "next", exclude_lead_id: excludeLeadId ?? null }),
    skip: (leadId: string, reason: string) => call({ action: "skip", lead_id: leadId, reason }),
    release: (leadId: string) => call({ action: "release", lead_id: leadId }),
  };
}

export async function sendAuditInvite(leadId: string, channel: "sms" | "email", reminder = false) {
  const { data, error } = await supabase.functions.invoke("affiliate-send-audit", {
    body: { lead_id: leadId, channel, reminder },
  });
  if (error) {
    // L'erreur utile est dans le corps de la réponse edge
    let detail = error.message;
    try {
      const ctx: any = (error as any).context;
      const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (body?.message || body?.error) detail = body.message ?? body.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
  return data as { ok: true; audit_id: string; link: string; channel: string; delivery_status: string };
}

/** Résultat d'appel — écrit dans contractor_leads + affiliate_lead_events. */
export async function recordCallOutcome(params: {
  affiliateId: string;
  leadId: string;
  outcome: "interested" | "send_audit" | "callback" | "no_answer" | "not_interested";
  callbackInHours?: number;
}) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_contacted_by: params.affiliateId,
    last_contacted_at: now,
    contact_status: "called",
    updated_at: now,
  };
  if (params.outcome === "not_interested") patch.contact_status = "not_interested";
  if (params.outcome === "callback") {
    patch.next_follow_up_at = new Date(Date.now() + (params.callbackInHours ?? 24) * 3600000).toISOString();
  }
  if (params.outcome === "no_answer") {
    patch.next_follow_up_at = new Date(Date.now() + 4 * 3600000).toISOString();
  }
  await (supabase as any).from("contractor_leads").update(patch).eq("id", params.leadId);
  await (supabase as any).from("affiliate_lead_events").insert({
    affiliate_id: params.affiliateId,
    lead_id: params.leadId,
    event_type: "status_changed",
    channel: "voice",
    payload: { call_outcome: params.outcome, at: now },
  });
}

export async function logCallStarted(affiliateId: string, leadId: string) {
  await (supabase as any).from("affiliate_lead_events").insert({
    affiliate_id: affiliateId,
    lead_id: leadId,
    event_type: "call_initiated",
    channel: "voice",
    payload: {},
  });
  trackAffiliateFunnel("call_started", { affiliate_id: affiliateId, metadata: { lead_id: leadId } });
}

/**
 * Offre affilié : 3 rendez-vous qualifiés offerts + code promo personnel
 * (50 % du premier mois payé seulement). Attribution permanente à l'affilié.
 */
export interface FreeAppointmentOffer {
  offer_id: string;
  promo_code: string;
  free_appointments: number;
  expires_at: string;
}

export async function offerFreeAppointments(params: {
  affiliateId: string;
  leadId: string;
  companyName?: string | null;
}): Promise<FreeAppointmentOffer> {
  const { data, error } = await (supabase as any).rpc("affiliate_offer_free_appointments", {
    _lead_id: params.leadId,
    _company_name: params.companyName ?? null,
    _notes: null,
  });
  if (error) throw new Error(error.message);
  const res = data as any;
  if (!res?.ok) throw new Error(res?.reason ?? "Offre impossible.");
  await (supabase as any).from("affiliate_lead_events").insert({
    affiliate_id: params.affiliateId,
    lead_id: params.leadId,
    event_type: "status_changed",
    channel: "voice",
    payload: { free_appointments_offered: res.free_appointments, promo_code: res.promo_code },
  });
  return {
    offer_id: res.offer_id,
    promo_code: res.promo_code,
    free_appointments: res.free_appointments,
    expires_at: res.expires_at,
  };
}


export interface DayStats {
  contacted: number;
  auditsSent: number;
  auditsOpened: number;
  auditsCompleted: number;
  conversions: number;
  commissionCents: number | null;
}

export function useDayStats(affiliateId?: string | null) {
  return useQuery<DayStats>({
    queryKey: ["affiliate-action-day-stats", affiliateId],
    enabled: !!affiliateId,
    refetchInterval: 60000,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const since = startOfDay.toISOString();

      const [{ data: events }, { data: audits }, { data: conversions }] = await Promise.all([
        (supabase as any)
          .from("affiliate_lead_events")
          .select("lead_id, event_type, created_at")
          .eq("affiliate_id", affiliateId)
          .gte("created_at", since),
        (supabase as any)
          .from("ai_recommendation_audits")
          .select("id, sent_at, opened_at, completed_at")
          .eq("affiliate_id", affiliateId)
          .gte("sent_at", since),
        (supabase as any)
          .from("affiliate_conversions")
          .select("id, commission_amount_cents, created_at, status")
          .eq("affiliate_id", affiliateId)
          .gte("created_at", since),
      ]);

      const evts = (events ?? []) as Array<{ lead_id: string; event_type: string }>;
      const contacted = new Set(
        evts.filter((e) => e.event_type === "call_initiated" || e.event_type === "unpro_sms_dispatched" || e.event_type === "email_sent").map((e) => e.lead_id)
      ).size;

      const auditRows = (audits ?? []) as Array<{ sent_at: string | null; opened_at: string | null; completed_at: string | null }>;
      const convRows = (conversions ?? []) as Array<{ commission_amount_cents: number | null }>;
      const commissionCents = convRows.length
        ? convRows.reduce((s, c) => s + (c.commission_amount_cents ?? 0), 0)
        : null;

      return {
        contacted,
        auditsSent: auditRows.filter((a) => a.sent_at).length,
        auditsOpened: auditRows.filter((a) => a.opened_at).length,
        auditsCompleted: auditRows.filter((a) => a.completed_at).length,
        conversions: convRows.length,
        commissionCents: commissionCents && commissionCents > 0 ? commissionCents : null,
      };
    },
  });
}

export function useRefreshStats() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ["affiliate-action-day-stats"] });
  }, [qc]);
}
