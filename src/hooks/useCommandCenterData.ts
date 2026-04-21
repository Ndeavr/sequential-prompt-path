/**
 * UNPRO — Command Center View Model Hook
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandCenterViewModel,
  CommandCenterLead,
  CommandCenterEvent,
  PipelineColumn,
  RepActionItem,
  TerritoryGapRow,
  CampaignPerformanceRow,
  CommandCenterKpis,
  PIPELINE_STAGES,
  getHeatLevel,
  getRecommendedAction,
  getActionLabelFr,
  getEventLabelFr,
  mapOutreachStatusToStage,
} from "@/services/dynamicPricingEngine";

export type CommandCenterFilters = {
  city: string;
  category: string;
  stage: string;
  founderOnly: boolean;
  search: string;
};

const DEFAULT_FILTERS: CommandCenterFilters = {
  city: "all",
  category: "all",
  stage: "all",
  founderOnly: false,
  search: "",
};

export function useCommandCenterData() {
  const [rawTargets, setRawTargets] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [rawCampaigns, setRawCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CommandCenterFilters>(DEFAULT_FILTERS);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [targetsRes, eventsRes, campaignsRes] = await Promise.all([
      supabase.from("sniper_targets" as any).select("*").order("heat_score", { ascending: false }).limit(500),
      supabase.from("sniper_engagement_events" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("outreach_campaigns" as any).select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setRawTargets((targetsRes.data || []) as any[]);
    setRawEvents((eventsRes.data || []) as any[]);
    setRawCampaigns((campaignsRes.data || []) as any[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const viewModel = useMemo((): CommandCenterViewModel => {
    // Map targets to leads
    let leads: CommandCenterLead[] = rawTargets.map((t: any) => {
      const heatScore = t.heat_score || 0;
      const stage = mapOutreachStatusToStage(t.outreach_status || "not_started");
      return {
        id: t.id,
        businessName: t.business_name || "—",
        city: t.city || null,
        category: t.category || null,
        stage,
        sniperPriorityScore: t.sniper_priority_score ?? null,
        heatScore,
        heatLevel: getHeatLevel(heatScore),
        founderEligible: !!t.founder_eligible,
        aippScore: null,
        lastActivityAt: t.updated_at || t.created_at,
        lastActivityLabel: null,
        recommendedAction: getRecommendedAction({
          heatScore,
          stage,
          founderEligible: !!t.founder_eligible,
          checkoutStarted: stage === "checkout_started",
          auditCompleted: stage === "audit_completed",
          planViewed: ["audit_completed", "checkout_started", "converted"].includes(stage),
        }),
        phone: t.phone || null,
        email: t.email || null,
        websiteUrl: t.website_url || null,
      };
    });

    // Apply filters
    if (filters.city !== "all") leads = leads.filter(l => l.city === filters.city);
    if (filters.category !== "all") leads = leads.filter(l => l.category === filters.category);
    if (filters.stage !== "all") leads = leads.filter(l => l.stage === filters.stage);
    if (filters.founderOnly) leads = leads.filter(l => l.founderEligible);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      leads = leads.filter(l => l.businessName.toLowerCase().includes(s) || (l.city || "").toLowerCase().includes(s));
    }

    // KPIs
    const allLeads = rawTargets;
    const kpis: CommandCenterKpis = {
      targetsImported: allLeads.length,
      sent: allLeads.filter((t: any) => ["sent", "engaged", "audit_started", "audit_completed", "checkout_started", "converted"].includes(t.outreach_status)).length,
      engaged: allLeads.filter((t: any) => ["engaged", "audit_started", "audit_completed", "checkout_started", "converted"].includes(t.outreach_status)).length,
      auditsStarted: allLeads.filter((t: any) => ["audit_started", "audit_completed", "checkout_started", "converted"].includes(t.outreach_status)).length,
      checkoutStarts: allLeads.filter((t: any) => ["checkout_started", "converted"].includes(t.outreach_status)).length,
      converted: allLeads.filter((t: any) => t.outreach_status === "converted").length,
      revenue: allLeads.filter((t: any) => t.outreach_status === "converted").length * 599, // estimated avg
      revenuePer100Targets: 0,
    };
    kpis.revenuePer100Targets = kpis.targetsImported > 0 ? Math.round((kpis.revenue / kpis.targetsImported) * 100) : 0;

    // Pipeline
    const pipeline: PipelineColumn[] = PIPELINE_STAGES.map(ps => ({
      stage: ps.stage,
      label: ps.label,
      count: leads.filter(l => l.stage === ps.stage).length,
      deltaVsYesterday: 0,
      leads: leads.filter(l => l.stage === ps.stage).slice(0, 5),
    }));

    // Hot leads (sorted by heat > priority > founder > recency)
    const hotLeads = [...leads]
      .filter(l => (l.heatScore || 0) >= 20)
      .sort((a, b) => {
        const hd = (b.heatScore || 0) - (a.heatScore || 0);
        if (hd !== 0) return hd;
        const pd = (b.sniperPriorityScore || 0) - (a.sniperPriorityScore || 0);
        if (pd !== 0) return pd;
        if (b.founderEligible !== a.founderEligible) return b.founderEligible ? 1 : -1;
        return 0;
      })
      .slice(0, 30);

    // Rep actions
    const repActions: RepActionItem[] = leads
      .filter(l => l.recommendedAction !== "pause")
      .sort((a, b) => {
        const urgA = a.heatLevel === "on_fire" ? 3 : a.heatLevel === "hot" ? 2 : a.heatLevel === "warm" ? 1 : 0;
        const urgB = b.heatLevel === "on_fire" ? 3 : b.heatLevel === "hot" ? 2 : b.heatLevel === "warm" ? 1 : 0;
        return urgB - urgA;
      })
      .slice(0, 15)
      .map(l => ({
        id: l.id,
        businessName: l.businessName,
        reason: buildReason(l),
        action: l.recommendedAction,
        urgency: (l.heatLevel === "on_fire" || l.heatLevel === "hot" ? "high" : l.heatLevel === "warm" ? "medium" : "low") as "high" | "medium" | "low",
      }));

    // Territory gaps
    const cityCategories = new Map<string, { city: string; category: string; targets: CommandCenterLead[] }>();
    leads.forEach(l => {
      const key = `${l.city || "N/A"}::${l.category || "N/A"}`;
      if (!cityCategories.has(key)) cityCategories.set(key, { city: l.city || "N/A", category: l.category || "N/A", targets: [] });
      cityCategories.get(key)!.targets.push(l);
    });
    const territoryGaps: TerritoryGapRow[] = Array.from(cityCategories.values())
      .map(g => ({
        city: g.city,
        category: g.category,
        activeCount: g.targets.filter(t => t.stage === "converted").length,
        targetCount: 8,
        gap: Math.max(0, 8 - g.targets.filter(t => t.stage === "converted").length),
        hotLeads: g.targets.filter(t => (t.heatScore || 0) >= 40).length,
        conversions: g.targets.filter(t => t.stage === "converted").length,
        founderSlotsRemaining: null,
      }))
      .sort((a, b) => b.gap - a.gap);

    // Campaign performance
    const campaignPerformance: CampaignPerformanceRow[] = rawCampaigns.map((c: any) => ({
      campaignName: c.campaign_name || c.name || "—",
      channel: c.channel || "email",
      city: c.city || null,
      category: c.category || null,
      sent: c.total_sent || 0,
      opens: c.total_opens || 0,
      clicks: c.total_clicks || 0,
      pageViews: c.total_page_views || 0,
      auditStarts: c.total_audit_starts || 0,
      checkoutStarts: c.total_checkout_starts || 0,
      conversions: c.total_conversions || 0,
      revenue: (c.total_conversions || 0) * 599,
    }));

    // Recent events
    const recentEvents: CommandCenterEvent[] = rawEvents.map((e: any) => ({
      id: e.id,
      label: getEventLabelFr(e.event_name || e.event_type || ""),
      businessName: e.business_name || "—",
      eventType: e.event_name || e.event_type || "",
      timestamp: e.created_at,
    }));

    return { kpis, hotLeads, pipeline, repActions, territoryGaps, campaignPerformance, recentEvents };
  }, [rawTargets, rawEvents, rawCampaigns, filters]);

  // Extract unique cities/categories for filters
  const cities = useMemo(() => [...new Set(rawTargets.map((t: any) => t.city).filter(Boolean))].sort(), [rawTargets]);
  const categories = useMemo(() => [...new Set(rawTargets.map((t: any) => t.category).filter(Boolean))].sort(), [rawTargets]);

  return { viewModel, loading, filters, setFilters, refresh: loadData, cities, categories };
}

function buildReason(lead: CommandCenterLead): string {
  if (lead.stage === "checkout_started") return "A démarré le checkout mais n'a pas finalisé.";
  if (lead.stage === "audit_completed") return "Audit terminé, en attente de sélection de plan.";
  if (lead.founderEligible && lead.heatLevel === "on_fire") return "Lead brûlant, éligible fondateur.";
  if (lead.heatLevel === "on_fire") return "Lead très chaud, action immédiate requise.";
  if (lead.stage === "engaged") return "Engagé, prêt pour l'audit.";
  if (lead.stage === "ready") return "Prêt à recevoir le premier contact.";
  if (lead.stage === "sent") return "Envoyé, aucun engagement encore.";
  return "Score sniper élevé, aucun envoi effectué.";
}
