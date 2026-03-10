/**
 * UNPRO — Growth Service
 * Tracks conversion events and provides growth metrics.
 */

import { supabase } from "@/integrations/supabase/client";

export type ConversionEvent =
  | "quote_uploaded"
  | "analysis_completed"
  | "appointment_requested"
  | "contractor_contacted"
  | "contractor_subscription"
  | "referral_shared"
  | "alex_interaction";

/** Log a conversion event (fire-and-forget, non-blocking) */
export const trackConversionEvent = (event: ConversionEvent, metadata?: Record<string, unknown>) => {
  // Use navigator.sendBeacon pattern — non-blocking
  console.info(`[UNPRO Growth] ${event}`, metadata);
  // Future: write to analytics table or external service
};

/** Build a share URL for quote analysis results */
export const buildShareUrl = (quoteId: string) => {
  return `${window.location.origin}/dashboard/quotes/${quoteId}`;
};

/** Copy text to clipboard */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Generate a referral message for quote analysis */
export const buildQuoteShareMessage = (score: number | null, amount: number | null): string => {
  const scoreText = score != null ? `Score d'équité : ${score}/100. ` : "";
  const amountText = amount ? `Montant : ${amount.toLocaleString("fr-CA")} $. ` : "";
  return `J'ai fait analyser ma soumission sur UNPRO. ${scoreText}${amountText}Essayez aussi → `;
};

/** Fetch admin growth metrics */
export const fetchGrowthMetrics = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers,
    newUsers30d,
    newUsers7d,
    totalContractors,
    newContractors30d,
    totalQuotes,
    newQuotes30d,
    totalAppointments,
    newAppointments30d,
    activeSubscriptions,
    totalLeads,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("contractors").select("id", { count: "exact", head: true }),
    supabase.from("contractors").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("quotes").select("id", { count: "exact", head: true }),
    supabase.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("contractor_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("lead_qualifications").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    newUsers30d: newUsers30d.count ?? 0,
    newUsers7d: newUsers7d.count ?? 0,
    totalContractors: totalContractors.count ?? 0,
    newContractors30d: newContractors30d.count ?? 0,
    totalQuotes: totalQuotes.count ?? 0,
    newQuotes30d: newQuotes30d.count ?? 0,
    totalAppointments: totalAppointments.count ?? 0,
    newAppointments30d: newAppointments30d.count ?? 0,
    activeSubscriptions: activeSubscriptions.count ?? 0,
    totalLeads: totalLeads.count ?? 0,
  };
};
