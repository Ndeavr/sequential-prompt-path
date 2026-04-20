/**
 * UNPRO — Acquisition Machine Service
 * Couche de consolidation qui agrège les métriques temps réel des modules existants
 * (outbound_*, aipp_*, payments, contractors) pour le cockpit unifié.
 *
 * Aucune nouvelle table : pure lecture des données existantes.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AcquisitionMetrics {
  leads_total: number;
  leads_today: number;
  emails_sent_today: number;
  emails_opened_today: number;
  emails_clicked_today: number;
  replies_today: number;
  bookings_today: number;
  payments_today: number;
  mrr_cents: number;
  revenue_today_cents: number;
  funnel: {
    new: number;
    enriched: number;
    scored: number;
    in_sequence: number;
    replied: number;
    booked: number;
    won: number;
    lost: number;
  };
}

export interface FunnelByCity {
  city: string;
  leads: number;
  bookings: number;
  conversions: number;
}

export interface FunnelByCategory {
  specialty: string;
  leads: number;
  bookings: number;
  conversions: number;
}

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export async function fetchAcquisitionMetrics(): Promise<AcquisitionMetrics> {
  const today = todayStart();

  // Compteurs en parallèle pour rapidité
  const sb = supabase as any;
  const [
    leadsTotal,
    leadsToday,
    emailsToday,
    repliesToday,
    bookingsToday,
    paymentsToday,
    activeSubs,
    funnelRows,
  ] = await Promise.all([
    sb.from("outbound_leads").select("id", { count: "exact", head: true }),
    sb.from("outbound_leads").select("id", { count: "exact", head: true }).gte("created_at", today),
    sb.from("outbound_sent_messages").select("opened_at,clicked_at,sent_at").gte("sent_at", today).limit(2000),
    sb.from("outbound_replies").select("id", { count: "exact", head: true }).gte("received_at", today),
    sb.from("outbound_leads").select("id", { count: "exact", head: true }).gte("booked_at", today),
    sb.from("contractor_recruitment_payments").select("amount_cents,created_at,status").gte("created_at", today).limit(500),
    sb.from("contractor_recruitment_payments").select("amount_cents,status").eq("status", "succeeded").limit(2000),
    sb.from("outbound_leads").select("pipeline_stage").limit(5000),
  ]);

  const sentRows = emailsToday.data ?? [];
  const opens = sentRows.filter((r: any) => r.opened_at).length;
  const clicks = sentRows.filter((r: any) => r.clicked_at).length;

  const payRows = (paymentsToday.data ?? []).filter((r: any) => r.status === "succeeded");
  const revenueToday = payRows.reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0);
  const mrr = (activeSubs.data ?? []).reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0);

  const funnel = (funnelRows.data ?? []).reduce(
    (acc: any, r: any) => {
      const s = r.pipeline_stage ?? "new";
      if (["new", "imported"].includes(s)) acc.new += 1;
      else if (s === "enriched") acc.enriched += 1;
      else if (s === "scored") acc.scored += 1;
      else if (["in_sequence", "approved_to_send"].includes(s)) acc.in_sequence += 1;
      else if (s.startsWith("replied")) acc.replied += 1;
      else if (s === "meeting_booked") acc.booked += 1;
      else if (s === "converted") acc.won += 1;
      else if (["closed_lost", "bounced", "unsubscribed", "suppressed"].includes(s)) acc.lost += 1;
      return acc;
    },
    { new: 0, enriched: 0, scored: 0, in_sequence: 0, replied: 0, booked: 0, won: 0, lost: 0 },
  );

  return {
    leads_total: leadsTotal.count ?? 0,
    leads_today: leadsToday.count ?? 0,
    emails_sent_today: sentRows.length,
    emails_opened_today: opens,
    emails_clicked_today: clicks,
    replies_today: repliesToday.count ?? 0,
    bookings_today: bookingsToday.count ?? 0,
    payments_today: payRows.length,
    mrr_cents: mrr,
    revenue_today_cents: revenueToday,
    funnel,
  };
}

export async function fetchTopCities(limit = 5): Promise<FunnelByCity[]> {
  const sb = supabase as any;
  const { data } = await sb
    .from("outbound_leads")
    .select("company_id, booked_at, converted_at, outbound_companies!inner(city)")
    .limit(2000);

  const map = new Map<string, FunnelByCity>();
  for (const r of (data ?? []) as any[]) {
    const city = r.outbound_companies?.city ?? "—";
    const cur = map.get(city) ?? { city, leads: 0, bookings: 0, conversions: 0 };
    cur.leads += 1;
    if (r.booked_at) cur.bookings += 1;
    if (r.converted_at) cur.conversions += 1;
    map.set(city, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.leads - a.leads).slice(0, limit);
}

export async function fetchTopCategories(limit = 5): Promise<FunnelByCategory[]> {
  const sb = supabase as any;
  const { data } = await sb
    .from("outbound_leads")
    .select("specialty, booked_at, converted_at")
    .limit(2000);

  const map = new Map<string, FunnelByCategory>();
  for (const r of (data ?? []) as any[]) {
    const sp = r.specialty ?? "—";
    const cur = map.get(sp) ?? { specialty: sp, leads: 0, bookings: 0, conversions: 0 };
    cur.leads += 1;
    if (r.booked_at) cur.bookings += 1;
    if (r.converted_at) cur.conversions += 1;
    map.set(sp, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.leads - a.leads).slice(0, limit);
}

// === KANBAN ===
export const KANBAN_STAGES = [
  { key: "new", label: "Nouveau", color: "bg-slate-500" },
  { key: "enriched", label: "Enrichi", color: "bg-blue-500" },
  { key: "scored", label: "Scoré", color: "bg-cyan-500" },
  { key: "approved_to_send", label: "Approuvé", color: "bg-indigo-500" },
  { key: "in_sequence", label: "En séquence", color: "bg-violet-500" },
  { key: "replied_positive", label: "Réponse +", color: "bg-amber-500" },
  { key: "meeting_booked", label: "RDV réservé", color: "bg-orange-500" },
  { key: "converted", label: "Gagné", color: "bg-emerald-500" },
  { key: "closed_lost", label: "Perdu", color: "bg-red-500" },
] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number]["key"];

export interface KanbanLead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  specialty: string | null;
  email: string | null;
  pipeline_stage: string | null;
  total_priority_score: number | null;
  last_contacted_at: string | null;
  hook_summary: string | null;
}

export async function fetchKanbanLeads(limit = 200): Promise<KanbanLead[]> {
  const { data, error } = await supabase
    .from("outbound_leads")
    .select("id,company_name,contact_name,specialty,email,pipeline_stage,total_priority_score,last_contacted_at,hook_summary")
    .order("total_priority_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KanbanLead[];
}

export async function moveLeadStage(leadId: string, stage: KanbanStage) {
  const { error } = await supabase
    .from("outbound_leads")
    .update({ pipeline_stage: stage, crm_status: stage, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw error;
}
