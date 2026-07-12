/**
 * System Health service — reads probes and alerts. All data is live.
 */
import { supabase } from "@/integrations/supabase/client";

export interface HealthProbe {
  probed_at: string;
  google: { ok: boolean; code: string; message: string; detail: any };
  twilio: { ok: boolean; code: string; message: string; detail: any };
  stripe: { ok: boolean; code: string; message: string; detail: any };
  resend: { ok: boolean; code: string; message: string; detail: any };
  edge_functions: { rows: Array<{ operation: string; total: number; success_rate: number; last_error: string | null; last_at: string | null }> };
  sms_metrics: { last_sent_at: string | null; last_delivered_at: string | null };
}

export async function runHealthProbe(): Promise<HealthProbe> {
  const { data, error } = await supabase.functions.invoke("system-health-probe", { body: {} });
  if (error) throw error;
  return data as HealthProbe;
}

export interface SystemAlert {
  id: string;
  source: string;
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  details: any;
  resolved: boolean;
  created_at: string;
}

export async function loadActiveAlerts(): Promise<SystemAlert[]> {
  const { data } = await (supabase as any)
    .from("system_alerts")
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as SystemAlert[];
}

export async function resolveAlert(id: string): Promise<void> {
  await (supabase as any)
    .from("system_alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", id);
}

export interface EdgeOutcomeRow {
  operation: string;
  last_run: string | null;
  success_count: number;
  fail_count: number;
  last_error: string | null;
  last_duration_ms: number | null;
}

/**
 * Canonical schema: `platform_operation_outcomes.business_outcome` (enum).
 * Rows with business_outcome ∈ {succeeded, recovered} count as success.
 * The table has no `duration_ms` column — `last_duration_ms` is always null here.
 */
const SUCCESS_OUTCOMES = new Set(["succeeded", "recovered"]);

export async function loadEdgeFunctionOutcomes(limit = 50): Promise<EdgeOutcomeRow[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await (supabase as any)
    .from("platform_operation_outcomes")
    .select("operation, business_outcome, failure_code, created_at")
    .gte("created_at", since)
    .limit(10000);
  const map = new Map<string, EdgeOutcomeRow>();
  for (const r of (data ?? []) as any[]) {
    const cur = map.get(r.operation) ?? {
      operation: r.operation,
      last_run: null,
      success_count: 0,
      fail_count: 0,
      last_error: null,
      last_duration_ms: null,
    };
    const ok = SUCCESS_OUTCOMES.has(r.business_outcome);
    if (ok) cur.success_count++;
    else {
      cur.fail_count++;
      if (!cur.last_error) cur.last_error = r.failure_code ?? r.business_outcome ?? "unknown";
    }
    if (!cur.last_run || r.created_at > cur.last_run) {
      cur.last_run = r.created_at;
    }
    map.set(r.operation, cur);
  }
  return [...map.values()].sort((a, b) => (b.last_run ?? "").localeCompare(a.last_run ?? "")).slice(0, limit);
}

export async function loadEdgeOutcomeDetail(operation: string, limit = 10) {
  const { data } = await (supabase as any)
    .from("platform_operation_outcomes")
    .select("*")
    .eq("operation", operation)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function replayPipeline(input: { prospect_id?: string; phone?: string }) {
  const { data, error } = await supabase.functions.invoke("pipeline-replay", { body: input });
  if (error) throw error;
  return data as { ok: boolean; prospect_id: string; failed_at: string | null; nodes: Array<{ step: string; status: "ok" | "fail" | "skip"; reason: string; payload: any }> };
}

export async function sendDirectSms(phone: string, body: string) {
  const { data, error } = await supabase.functions.invoke("test-sms-direct", { body: { phone, body } });
  if (error) throw error;
  return data;
}

export async function searchProspects(query: string, limit = 15) {
  let q: any = (supabase as any).from("contractor_prospects").select("id, business_name, phone, city, created_at").order("created_at", { ascending: false }).limit(limit);
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    q = q.or(`business_name.ilike.${like},phone.ilike.${like},city.ilike.${like},id.eq.${query.trim()}`);
  }
  const { data } = await q;
  return data ?? [];
}

/** Revenue truth bucketing — separates Paid / Pending / Abandoned / Test. */
export interface RevenueTruth {
  paid: number;
  pending: number;
  abandoned: number;
  test: number;
  total_paid_amount_cents: number;
}

export async function loadRevenueTruth(): Promise<RevenueTruth> {
  const { data } = await (supabase as any)
    .from("contractor_checkouts")
    .select("payment_status, amount_total, stripe_checkout_reference, created_at, paid_at, metadata")
    .limit(5000);
  let paid = 0, pending = 0, abandoned = 0, test = 0, total = 0;
  const cutoff = Date.now() - 24 * 3600 * 1000;
  for (const r of (data ?? []) as any[]) {
    const isTest = r.metadata?.livemode === false || /^cs_test_/.test(r.stripe_checkout_reference ?? "");
    if (isTest) { test++; continue; }
    if (r.payment_status === "paid") { paid++; total += r.amount_total ?? 0; continue; }
    const created = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (created && created < cutoff && r.payment_status !== "paid") { abandoned++; continue; }
    pending++;
  }
  return { paid, pending, abandoned, test, total_paid_amount_cents: total };
}

export interface CriticalBlocker {
  key: string;
  label: string;
  severity: "critical" | "warning" | "ok";
  detail: string;
}

export async function computeCriticalBlockers(probe: HealthProbe | null, funnelHasSms: boolean, eligibleProspects: number): Promise<CriticalBlocker[]> {
  const out: CriticalBlocker[] = [];
  if (probe) {
    out.push({
      key: "google_places",
      label: "Google Places API",
      severity: probe.google.ok ? "ok" : "critical",
      detail: probe.google.ok ? "Opérationnel" : `${probe.google.code} — ${probe.google.message}`,
    });
    out.push({
      key: "twilio",
      label: "Twilio",
      severity: probe.twilio.ok ? "ok" : "critical",
      detail: probe.twilio.ok ? `Compte ${probe.twilio.detail?.friendly_name ?? ""} ${probe.twilio.detail?.status ?? ""}` : `${probe.twilio.code} — ${probe.twilio.message}`,
    });
    out.push({
      key: "stripe",
      label: "Stripe",
      severity: probe.stripe.ok ? "ok" : "critical",
      detail: probe.stripe.ok ? (probe.stripe.detail?.livemode ? "LIVE" : "TEST") : `${probe.stripe.code} — ${probe.stripe.message}`,
    });
    out.push({
      key: "resend",
      label: "Resend",
      severity: probe.resend.ok ? "ok" : "warning",
      detail: probe.resend.ok ? "Opérationnel" : `${probe.resend.code} — ${probe.resend.message}`,
    });
  }
  if (!funnelHasSms && eligibleProspects > 0) {
    out.push({
      key: "sms_idle",
      label: "SMS Engine Idle",
      severity: "critical",
      detail: `${eligibleProspects} prospects avec téléphone en attente, 0 SMS en 24h`,
    });
  }
  return out;
}
