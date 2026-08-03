/**
 * UNPRO — CRM operations hooks.
 * Source of truth: v_crm_prospects (superset of v_prospect_funnel). No mock data.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CrmProspect = {
  prospect_id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  campaign_id: string | null;
  current_stage: string;
  sms_sent: number;
  sms_delivered: number;
  sms_undelivered: number;
  sms_failed: number;
  sms_no_callback: number;
  sent_at: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
  landing_at: string | null;
  registered_at: string | null;
  otp_verified_at: string | null;
  checkout_at: string | null;
  paid_at: string | null;
  revenue_cents: number;
  last_error: string | null;
  last_sid: string | null;
  last_activity_at: string | null;
  hours_since_last_activity: number | null;
  priority_score: number;
  health_score: number;
  needs_action: boolean;
  emails_sent: number;
  tags: string[];
  has_email: boolean;
  no_email: boolean;
  phone_invalid: boolean;
  no_website: boolean;
  missing_rbq: boolean;
  missing_gbp: boolean;
  is_duplicate: boolean;
  opted_out: boolean;
  paid_today: boolean;
  activated_this_week: boolean;
  recoverable_revenue_cents: number;
  /** Scoring layer (v_crm_next_action) */
  activation_probability: number;
  estimated_value_cents: number;
  blocked_reason: string;
  next_best_action: string;
};

export const BLOCKED_REASON_LABELS: Record<string, string> = {
  aucun: "Aucun blocage",
  desabonne: "Désabonné",
  paiement_non_complete: "Paiement non complété",
  inscription_sans_paiement: "Inscrit sans paiement",
  clic_sans_inscription: "Clic sans inscription",
  ligne_fixe: "Ligne fixe (SMS impossible)",
  a2p_non_enregistre: "Routage A2P bloqué",
  sms_non_livre: "SMS non livré",
  livre_sans_clic: "Livré sans clic",
  sms_sans_accuse: "SMS sans accusé",
  aucun_canal: "Aucun canal joignable",
  non_valide: "Non validé",
  jamais_contacte: "Jamais contacté",
};

export const NEXT_ACTION_LABELS: Record<string, string> = {
  none: "Aucune action",
  second_sms: "Envoyer 2e SMS",
  onboarding_email: "Courriel onboarding",
  send_email: "Rappel courriel",
  payment_email: "Courriel paiement",
};

/** Expected value in dollars = probabilité × valeur estimée. */
export function expectedValue(r: CrmProspect): number {
  return (r.activation_probability / 100) * (r.estimated_value_cents / 100);
}


export const CRM_STAGES: { key: string; label: string }[] = [
  { key: "scraped", label: "Scrapé" },
  { key: "validated", label: "Validé" },
  { key: "sent", label: "SMS envoyé" },
  { key: "send_failed", label: "Échec SMS" },
  { key: "undelivered", label: "Non livré" },
  { key: "delivered", label: "Livré" },
  { key: "clicked", label: "Cliqué" },
  { key: "landing_viewed", label: "Page vue" },
  { key: "registered", label: "Inscrit" },
  { key: "otp_verified", label: "OTP vérifié" },
  { key: "checkout_opened", label: "Checkout ouvert" },
  { key: "paid", label: "Activé 1 $" },
];

export type SmartFilter =
  | "all"
  | "failed_sms"
  | "delivered"
  | "delivered_no_click"
  | "clicked_no_registration"
  | "registered_no_payment"
  | "checkout_abandoned"
  | "paid_today"
  | "activated_week"
  | "has_email"
  | "phone_invalid"
  | "no_email"
  | "duplicate"
  | "no_website"
  | "missing_rbq"
  | "missing_gbp"
  | "high_potential"
  | "recent_activity";

export const SMART_FILTERS: { key: SmartFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "failed_sms", label: "Échecs SMS" },
  { key: "delivered", label: "Livrés" },
  { key: "delivered_no_click", label: "Livrés sans clic" },
  { key: "clicked_no_registration", label: "Cliqués sans inscription" },
  { key: "registered_no_payment", label: "Inscrits sans paiement" },
  { key: "checkout_abandoned", label: "Checkout abandonné" },
  { key: "paid_today", label: "Payés aujourd'hui" },
  { key: "activated_week", label: "Activés cette semaine" },
  { key: "has_email", label: "Courriel disponible" },
  { key: "phone_invalid", label: "Téléphone invalide" },
  { key: "no_email", label: "Sans courriel" },
  { key: "duplicate", label: "Doublon" },
  { key: "no_website", label: "Sans site web" },
  { key: "missing_rbq", label: "RBQ manquant" },
  { key: "missing_gbp", label: "Google manquant" },
  { key: "high_potential", label: "Fort potentiel" },
  { key: "recent_activity", label: "Activité récente" },
];

export function applySmartFilter(rows: CrmProspect[], f: SmartFilter): CrmProspect[] {
  switch (f) {
    case "failed_sms": return rows.filter((r) => r.sms_failed > 0 || r.sms_undelivered > 0);
    case "delivered": return rows.filter((r) => r.sms_delivered > 0);
    case "delivered_no_click": return rows.filter((r) => r.sms_delivered > 0 && !r.clicked_at);
    case "clicked_no_registration": return rows.filter((r) => !!r.clicked_at && !r.registered_at);
    case "registered_no_payment": return rows.filter((r) => !!r.registered_at && !r.paid_at);
    case "checkout_abandoned": return rows.filter((r) => !!r.checkout_at && !r.paid_at);
    case "paid_today": return rows.filter((r) => r.paid_today);
    case "activated_week": return rows.filter((r) => r.activated_this_week);
    case "has_email": return rows.filter((r) => r.has_email);
    case "phone_invalid": return rows.filter((r) => r.phone_invalid);
    case "no_email": return rows.filter((r) => r.no_email);
    case "duplicate": return rows.filter((r) => r.is_duplicate);
    case "no_website": return rows.filter((r) => r.no_website);
    case "missing_rbq": return rows.filter((r) => r.missing_rbq);
    case "missing_gbp": return rows.filter((r) => r.missing_gbp);
    case "high_potential": return rows.filter((r) => r.health_score >= 70 && !r.paid_at);
    case "recent_activity": return rows.filter((r) => (r.hours_since_last_activity ?? 999) <= 24);
    default: return rows;
  }
}

export function useCrmProspects(refreshMs = 10_000) {
  const [rows, setRows] = useState<CrmProspect[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("v_crm_next_action")
      .select("*")
      .order("priority_score", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as CrmProspect[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.current_stage] = (m[r.current_stage] ?? 0) + 1;
    return m;
  }, [rows]);

  const kpis = useMemo(() => {
    const paidToday = rows.filter((r) => r.paid_today);
    const paid = rows.filter((r) => r.paid_at);
    const sent = rows.filter((r) => r.sms_sent > 0).length;
    const delivered = rows.filter((r) => r.sms_delivered > 0).length;
    const emailsSent = rows.reduce((a, r) => a + r.emails_sent, 0);
    const emailRegistered = rows.filter((r) => r.emails_sent > 0 && r.registered_at).length;
    const times = paid
      .filter((r) => r.sent_at && r.paid_at)
      .map((r) => (new Date(r.paid_at!).getTime() - new Date(r.sent_at!).getTime()) / 3600000);
    return {
      revenueToday: paidToday.reduce((a, r) => a + r.revenue_cents, 0) / 100,
      activations: paid.length,
      paidPlans: paid.filter((r) => r.revenue_cents > 100).length,
      smsSuccess: sent ? Math.round((delivered / sent) * 100) : 0,
      emailSuccess: emailsSent ? Math.round((emailRegistered / emailsSent) * 100) : 0,
      failedSms: rows.filter((r) => r.sms_failed > 0 || r.sms_undelivered > 0).length,
      checkoutAbandoned: rows.filter((r) => r.checkout_at && !r.paid_at).length,
      recoverable: rows.reduce((a, r) => a + r.recoverable_revenue_cents, 0) / 100,
      avgHoursToActivation: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    };
  }, [rows]);

  return { rows, loading, reload: load, stageCounts, kpis };
}

export type TimelineEntry = {
  occurred_at: string;
  kind: string;
  label: string;
  detail: string | null;
  meta: Record<string, unknown>;
};

export function useProspectTimeline(prospectId: string | null) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!prospectId) return setEntries([]);
    setLoading(true);
    const { data } = await (supabase as any).rpc("crm_prospect_timeline", { _prospect_id: prospectId });
    setEntries((data ?? []) as TimelineEntry[]);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { load(); }, [load]);
  return { entries, loading, reload: load };
}

export async function runCrmAction(
  action: string,
  prospectIds: string[],
  opts: { reason?: string; payload?: Record<string, unknown>; dryRun?: boolean } = {},
) {
  const { data, error } = await supabase.functions.invoke("crm-recovery-action", {
    body: {
      action,
      prospect_ids: prospectIds,
      reason: opts.reason ?? "crm_manual",
      payload: opts.payload ?? {},
      dry_run: opts.dryRun ?? false,
      source: "manual",
    },
  });
  if (error) throw error;
  return data as { succeeded: number; failed: number; skipped: number; results: any[] };
}

/** Contextual next-best actions per funnel stage. */
export function actionsForStage(r: CrmProspect): { action: string; label: string; disabled?: boolean }[] {
  if (r.paid_at) {
    return [
      { action: "activate_now", label: "Activer" },
      { action: "alex_onboarding", label: "Onboarding Alex" },
    ];
  }
  if (r.checkout_at) {
    return [
      { action: "resume_checkout", label: "Reprendre checkout" },
      { action: "new_checkout", label: "Nouveau lien" },
      { action: "payment_email", label: "Courriel paiement", disabled: !r.has_email },
      { action: "payment_sms", label: "SMS paiement" },
    ];
  }
  if (r.registered_at || r.otp_verified_at) {
    return [
      { action: "resume_checkout", label: "Reprendre checkout" },
      { action: "payment_email", label: "Courriel paiement", disabled: !r.has_email },
      { action: "payment_sms", label: "SMS paiement" },
    ];
  }
  if (r.clicked_at || r.landing_at) {
    return [
      { action: "send_email", label: "Rappel courriel", disabled: !r.has_email },
      { action: "second_sms", label: "Rappel SMS" },
      { action: "schedule_followup", label: "Planifier relance" },
    ];
  }
  if (r.sms_failed > 0 || r.sms_undelivered > 0) {
    return [
      { action: "validate_phone", label: "Valider téléphone" },
      { action: "retry_sms", label: "Réessayer SMS" },
      { action: "onboarding_email", label: "Courriel à la place", disabled: !r.has_email },
    ];
  }
  if (r.sms_delivered > 0) {
    return [
      { action: "second_sms", label: "2e SMS" },
      { action: "send_email", label: "Courriel", disabled: !r.has_email },
      { action: "schedule_followup", label: "Planifier relance" },
    ];
  }
  return [
    { action: "validate_phone", label: "Valider téléphone" },
    { action: "retry_sms", label: "Envoyer SMS" },
    { action: "onboarding_email", label: "Courriel", disabled: !r.has_email },
  ];
}
