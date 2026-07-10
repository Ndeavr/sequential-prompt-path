/**
 * UNPRO — /admin/outreach-command-center
 * Revenue War Room V1 — the single page that drives first-paid-contractor acquisition.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Radio } from "lucide-react";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import {
  useOutreachFunnel,
  useFirstRevenueSnapshot,
  useTemplatePerformance,
  usePriorityQueue,
} from "@/hooks/useOutreachCommandCenter";
import FunnelStageCard from "@/components/admin/outreach/FunnelStageCard";
import FirstRevenueTracker from "@/components/admin/outreach/FirstRevenueTracker";
import TemplatePerformanceTable from "@/components/admin/outreach/TemplatePerformanceTable";
import PriorityQueueTable from "@/components/admin/outreach/PriorityQueueTable";
import FeatureFreezeBanner from "@/components/admin/outreach/FeatureFreezeBanner";

export default function PageOutreachCommandCenter() {
  useAdminPageTracking();
  const { data: funnel = [], isLoading: funnelLoading } = useOutreachFunnel();
  const { data: revenue, isLoading: revenueLoading } = useFirstRevenueSnapshot();
  const { data: templates = [], isLoading: templatesLoading } = useTemplatePerformance();
  const { data: priority = [], isLoading: priorityLoading } = usePriorityQueue(50);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-400">LIVE</span>
            </div>
            <h1 className="text-3xl font-bold text-readable">Outreach Command Center</h1>
            <p className="text-sm text-readable-muted mt-1">
              Revenue War Room V1 — acquisition autonome jusqu'au premier entrepreneur payant.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-right text-xs">
            <Link
              to="/admin/contacted-contractors"
              className="text-readable-muted hover:text-readable inline-flex items-center gap-1"
            >
              Contactés <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              to="/admin/revenue-debug"
              className="text-readable-muted hover:text-readable inline-flex items-center gap-1"
            >
              Revenue Debug <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </header>

        <FirstRevenueTracker snapshot={revenue} isLoading={revenueLoading} />

        <FeatureFreezeBanner />

        {/* Funnel */}
        <section>
          <h2 className="text-lg font-semibold text-readable mb-3">Funnel Live — 10 étapes</h2>
          {funnelLoading ? (
            <div className="text-sm text-readable-muted">Chargement…</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {funnel.map((stage, i) => (
                <div key={stage.stage_key} className="flex items-center gap-3">
                  <FunnelStageCard
                    stage={stage}
                    previousTotal={i > 0 ? funnel[i - 1].total : undefined}
                    isFirst={i === 0}
                  />
                  {i < funnel.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-readable-muted shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <TemplatePerformanceTable rows={templates} isLoading={templatesLoading} />

        <PriorityQueueTable rows={priority} isLoading={priorityLoading} />
      </div>
    </div>
  );
}
