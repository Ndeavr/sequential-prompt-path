/**
 * UNPRO — Command Center Campaigns Sub-Page
 */
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import CampaignPerformancePanel from "@/components/command-center/CampaignPerformancePanel";
import KpiStrip from "@/components/command-center/KpiStrip";

export default function PageCommandCenterCampaigns() {
  const { viewModel, loading } = useCommandCenterData();

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Campagnes</h1>
        <p className="text-xs text-muted-foreground">Performance des campagnes Sniper</p>
      </div>
      <KpiStrip kpis={viewModel.kpis} />
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <CampaignPerformancePanel rows={viewModel.campaignPerformance} />
      )}
    </div>
  );
}
