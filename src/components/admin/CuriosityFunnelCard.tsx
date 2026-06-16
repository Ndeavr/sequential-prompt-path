/**
 * UNPRO — CuriosityFunnelCard
 * Real-time health for the AI Score Curiosity funnel (SMS → /ia/:slug → reveal → activation → paid).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OperationHealthCard, type OperationHealthMetrics } from "./OperationHealthCard";

type Counts = {
  sms_sent: number;
  sms_delivered: number;
  page_view: number;
  cta_revealed: number;
  score_revealed: number;
  cta_activate_clicked: number;
  paid: number;
  sms_failed: number;
  unsubscribed: number;
};

export function CuriosityFunnelCard() {
  const [c, setC] = useState<Counts | null>(null);

  async function load() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("curiosity_funnel_events")
      .select("event_type")
      .gte("created_at", since);
    const rows = (data ?? []) as { event_type: string }[];
    const counts: Counts = {
      sms_sent: 0, sms_delivered: 0, page_view: 0, cta_revealed: 0,
      score_revealed: 0, cta_activate_clicked: 0, paid: 0, sms_failed: 0, unsubscribed: 0,
    };
    for (const r of rows) {
      if (r.event_type in counts) (counts as any)[r.event_type]++;
    }
    setC(counts);
  }

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const metrics: OperationHealthMetrics = {
    generated: c?.sms_sent ?? 0,
    sent: c?.sms_sent ?? 0,
    delivered: (c?.page_view ?? 0),
    failed: c?.sms_failed ?? 0,
    blocked: c?.unsubscribed ?? 0,
    revenueImpactCents: (c?.paid ?? 0) * 34900,
  };

  return (
    <div className="space-y-3">
      <OperationHealthCard
        title="Curiosity Funnel · /ia/:slug (7j)"
        service="run-curiosity-sms-worker"
        metrics={metrics}
        nextAction={`Reveal: ${c?.score_revealed ?? 0} · Activate clicks: ${c?.cta_activate_clicked ?? 0} · Paid: ${c?.paid ?? 0}`}
      />
    </div>
  );
}

export default CuriosityFunnelCard;
