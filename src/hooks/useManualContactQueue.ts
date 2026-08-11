/**
 * UNPRO — File « À contacter manuellement ».
 * Source: v_manual_contact_queue (admin) / manual_queue_for_me() (affilié).
 * Aucune donnée fictive : uniquement des prospects réels de production.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runCrmAction } from "@/hooks/useCrmOperations";

export type ManualQueueRow = {
  prospect_id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  website_url: string | null;
  rbq_number: string | null;
  google_business_url: string | null;
  current_stage: string;
  priority_score: number;
  health_score: number;
  activation_probability: number;
  estimated_value_cents: number;
  blocked_reason: string;
  next_best_action: string;
  opted_out: boolean;
  paid_at: string | null;
  last_activity_at: string | null;
  hours_since_last_activity: number | null;
  /** Assignation */
  assignment_id: string | null;
  affiliate_id: string | null;
  owner_user_id: string | null;
  assignment_status: string | null;
  assignment_next_action: string | null;
  due_at: string | null;
  attempts: number | null;
  last_outcome: string | null;
  last_outcome_at: string | null;
  objection: string | null;
  assigned_at: string | null;
  affiliate_name: string | null;
  is_overdue: boolean;
  is_unassigned: boolean;
  can_sms: boolean;
  can_email: boolean;
  activation_token: string | null;
};

export type AffiliateWorkload = {
  affiliate_id: string;
  name: string | null;
  primary_city: string | null;
  daily_quota: number | null;
  active_assignments: number;
  not_started: number;
  overdue: number;
  contacted: number;
  activations: number;
  total_attempts: number;
};

export const OUTCOMES: { key: string; label: string; terminal?: boolean }[] = [
  { key: "interested", label: "Intéressé" },
  { key: "follow_up", label: "À relancer" },
  { key: "not_now", label: "Pas maintenant" },
  { key: "no_value_understanding", label: "Ne comprend pas la valeur" },
  { key: "no_trust", label: "Ne fait pas confiance à UNPRO" },
  { key: "price_objection", label: "Objection de prix" },
  { key: "wants_guaranteed_appointments", label: "Veut des RDV garantis" },
  { key: "buys_leads_elsewhere", label: "Achète déjà des leads" },
  { key: "checkout_issue", label: "Problème de paiement" },
  { key: "activated", label: "Activé 1 $", terminal: true },
  { key: "not_interested", label: "Pas intéressé", terminal: true },
  { key: "invalid_contact", label: "Contact invalide", terminal: true },
];

export const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOMES.map((o) => [o.key, o.label]),
);

export const TERMINAL_OUTCOMES = new Set(
  OUTCOMES.filter((o) => o.terminal).map((o) => o.key),
);

export type QueueFilter =
  | "all"
  | "unassigned"
  | "mine"
  | "affiliate"
  | "overdue"
  | "high_intent"
  | "callable"
  | "emailable";

export const QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "unassigned", label: "Non assignés" },
  { key: "mine", label: "À moi" },
  { key: "affiliate", label: "Affiliés" },
  { key: "overdue", label: "En retard" },
  { key: "high_intent", label: "Fort intérêt" },
  { key: "callable", label: "Téléphone valide" },
  { key: "emailable", label: "Courriel dispo" },
];

/** Valeur attendue en dollars = probabilité × valeur estimée. */
export function queueExpectedValue(r: ManualQueueRow): number {
  return (r.activation_probability / 100) * (r.estimated_value_cents / 100);
}

export function useManualContactQueue(refreshMs = 15_000) {
  const [rows, setRows] = useState<ManualQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await (supabase as any)
      .from("v_manual_contact_queue")
      .select("*")
      .is("paid_at", null)
      .order("priority_score", { ascending: false })
      .limit(400);
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as ManualQueueRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      unassigned: rows.filter((r) => r.is_unassigned).length,
      assigned: rows.filter((r) => !r.is_unassigned).length,
      overdue: rows.filter((r) => r.is_overdue).length,
      mine: rows.filter((r) => r.owner_user_id && r.owner_user_id === userId).length,
    }),
    [rows, userId],
  );

  return { rows, loading, error, reload: load, counts, userId };
}

export function applyQueueFilter(
  rows: ManualQueueRow[],
  f: QueueFilter,
  userId: string | null,
): ManualQueueRow[] {
  switch (f) {
    case "unassigned": return rows.filter((r) => r.is_unassigned);
    case "mine": return rows.filter((r) => r.owner_user_id === userId);
    case "affiliate": return rows.filter((r) => !!r.affiliate_id);
    case "overdue": return rows.filter((r) => r.is_overdue);
    case "high_intent":
      return rows.filter((r) => r.current_stage === "clicked" || r.current_stage === "registered" || r.current_stage === "checkout_opened");
    case "callable": return rows.filter((r) => r.can_sms);
    case "emailable": return rows.filter((r) => r.can_email);
    default: return rows;
  }
}

export function useEligibleAffiliates() {
  const [rows, setRows] = useState<AffiliateWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("v_affiliate_workload")
      .select("*")
      .order("active_assignments", { ascending: true });
    setRows((data ?? []) as AffiliateWorkload[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}

/** Actions de la file manuelle — toutes journalisées via crm-recovery-action. */
export const queueActions = {
  assign: (ids: string[], payload: Record<string, unknown>) =>
    runCrmAction("assign", ids, { reason: "manual_queue_assign", payload }),
  reassign: (ids: string[], payload: Record<string, unknown>) =>
    runCrmAction("reassign", ids, { reason: "manual_queue_reassign", payload }),
  unassign: (ids: string[]) =>
    runCrmAction("unassign", ids, { reason: "manual_queue_unassign" }),
  reclaim: (ids: string[]) =>
    runCrmAction("reclaim_overdue", ids, { reason: "manual_queue_reclaim" }),
  logOutcome: (id: string, payload: Record<string, unknown>) =>
    runCrmAction("log_outcome", [id], { reason: "manual_queue_outcome", payload }),
  sendActivationLink: (ids: string[], channel: "sms" | "email") =>
    runCrmAction("send_activation_link", ids, {
      reason: "manual_queue_activation_link",
      payload: { channel },
    }),
  logManualContact: (id: string, channel: "call" | "sms" | "email") =>
    runCrmAction("manual_contact_logged", [id], {
      reason: "manual_queue_contact",
      payload: { channel },
    }),
};

/** Liens directs depuis l'appareil de l'opérateur. */
export function contactHref(kind: "call" | "sms" | "email", row: { phone_e164: string | null; email: string | null; business_name: string | null }) {
  if (kind === "call") return row.phone_e164 ? `tel:${row.phone_e164}` : null;
  if (kind === "sms") {
    if (!row.phone_e164) return null;
    const body = encodeURIComponent(
      `Bonjour, ici UNPRO. Nous recevons des demandes dans votre secteur. Puis-je vous expliquer en 2 minutes ?`,
    );
    return `sms:${row.phone_e164}?&body=${body}`;
  }
  if (!row.email) return null;
  const subject = encodeURIComponent(`${row.business_name ?? "Votre entreprise"} — demandes reçues dans votre secteur`);
  return `mailto:${row.email}?subject=${subject}`;
}

export function profileHref(prospectId: string) {
  return `/contractor/ai-score/${prospectId}`;
}

export function activationHref(token: string | null) {
  return token ? `https://unpro.ca/unpro/activate/${token}` : null;
}
