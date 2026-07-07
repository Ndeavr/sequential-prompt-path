/**
 * Revenue Reality service — direct read-only queries against production tables.
 * No caching, no derived metrics. Truth or nothing.
 */
import { supabase } from "@/integrations/supabase/client";

const H24 = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q: any = (supabase as any).from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export interface FunnelStep {
  key: string;
  label: string;
  count_24h: number;
  count_total: number;
  last_at: string | null;
}

export async function loadFunnel(): Promise<FunnelStep[]> {
  const since = H24();
  const steps: Array<[string, string, () => Promise<{ c24: number; total: number; last: string | null }>]> = [
    ["scraped", "Scraped (contractor_prospects)", async () => ({
      c24: await count("contractor_prospects", (q) => q.gte("created_at", since)),
      total: await count("contractor_prospects"),
      last: await lastAt("contractor_prospects", "created_at"),
    })],
    ["valid_mobile", "Valid mobile (phone present, not DNC)", async () => ({
      c24: await count("contractor_prospects", (q) => q.gte("created_at", since).not("phone", "is", null).neq("phone", "").neq("do_not_contact", true)),
      total: await count("contractor_prospects", (q) => q.not("phone", "is", null).neq("phone", "").neq("do_not_contact", true)),
      last: await lastAt("contractor_prospects", "created_at"),
    })],
    ["sms_sent", "SMS sent (acq_sms_logs)", async () => ({
      c24: await count("acq_sms_logs", (q) => q.gte("created_at", since)),
      total: await count("acq_sms_logs"),
      last: await lastAt("acq_sms_logs", "created_at"),
    })],
    ["sms_delivered", "SMS delivered", async () => ({
      c24: await count("acq_sms_logs", (q) => q.gte("created_at", since).eq("status", "delivered")),
      total: await count("acq_sms_logs", (q) => q.eq("status", "delivered")),
      last: await lastAt("acq_sms_logs", "created_at", (q: any) => q.eq("status", "delivered")),
    })],
    ["clicked", "Clicked (click_events)", async () => ({
      c24: await count("click_events", (q) => q.gte("created_at", since)),
      total: await count("click_events"),
      last: await lastAt("click_events", "created_at"),
    })],
    ["onboarding_started", "Onboarding started", async () => ({
      c24: await count("contractor_activation_events", (q) => q.gte("created_at", since)),
      total: await count("contractor_activation_events"),
      last: await lastAt("contractor_activation_events", "created_at"),
    })],
    ["checkout_opened", "Checkout opened", async () => ({
      c24: await count("contractor_checkouts", (q) => q.gte("created_at", since)),
      total: await count("contractor_checkouts"),
      last: await lastAt("contractor_checkouts", "created_at"),
    })],
    ["paid", "Paid", async () => ({
      c24: await count("contractor_checkouts", (q) => q.gte("created_at", since).eq("payment_status", "paid")),
      total: await count("contractor_checkouts", (q) => q.eq("payment_status", "paid")),
      last: await lastAt("contractor_checkouts", "paid_at", (q: any) => q.eq("payment_status", "paid")),
    })],
  ];

  const out: FunnelStep[] = [];
  for (const [key, label, fn] of steps) {
    try {
      const { c24, total, last } = await fn();
      out.push({ key, label, count_24h: c24, count_total: total, last_at: last });
    } catch (err) {
      console.warn("[revenue-reality] step failed", key, err);
      out.push({ key, label, count_24h: 0, count_total: 0, last_at: null });
    }
  }
  return out;
}

async function lastAt(table: string, col: string, filter?: (q: any) => any): Promise<string | null> {
  let q: any = (supabase as any).from(table).select(col).order(col, { ascending: false }).limit(1);
  if (filter) q = filter(q);
  const { data } = await q;
  return data?.[0]?.[col] ?? null;
}

export interface Blocker {
  agent: string;
  event: string;
  message: string;
  count: number;
}

export async function loadTopBlockers(): Promise<Blocker[]> {
  const since = H24();
  const { data, error } = await (supabase as any)
    .from("launch_pipeline_events")
    .select("agent, event, message")
    .eq("success", false)
    .gte("created_at", since)
    .limit(5000);
  if (error) return [];
  const map = new Map<string, Blocker>();
  for (const row of (data ?? []) as any[]) {
    const key = `${row.agent}|${row.event}|${row.message ?? ""}`;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { agent: row.agent, event: row.event, message: row.message ?? "", count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export interface SmsRow {
  id: string;
  contractor_id: string | null;
  recipient_phone: string;
  body: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export async function loadRecentSms(limit = 25): Promise<SmsRow[]> {
  const { data } = await (supabase as any)
    .from("acq_sms_logs")
    .select("id, contractor_id, recipient_phone, body, status, provider_message_id, error, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SmsRow[];
}

export interface CheckoutRow {
  id: string;
  contractor_id: string | null;
  payment_status: string | null;
  amount_total: number | null;
  paid_at: string | null;
  created_at: string;
  stripe_checkout_reference: string | null;
}

export async function loadRecentCheckouts(limit = 25): Promise<CheckoutRow[]> {
  const { data } = await (supabase as any)
    .from("contractor_checkouts")
    .select("id, contractor_id, payment_status, amount_total, paid_at, created_at, stripe_checkout_reference")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CheckoutRow[];
}

export async function triggerEmergencyBlast(dryRun: boolean): Promise<any> {
  const { data, error } = await supabase.functions.invoke("emergency-sms-blast", {
    body: { dry_run: dryRun, batch: 25, force_first_to: "+15142499522" },
  });
  if (error) throw error;
  return data;
}
