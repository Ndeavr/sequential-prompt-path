/**
 * UNPRO — Sales Command Center v2
 */
import { useState } from "react";
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import TopCommandBar from "@/components/command-center/TopCommandBar";
import KpiStrip from "@/components/command-center/KpiStrip";
import HotLeadsPanel from "@/components/command-center/HotLeadsPanel";
import PipelineBoard from "@/components/command-center/PipelineBoard";
import RepActionQueue from "@/components/command-center/RepActionQueue";
import TerritoryGapPanel from "@/components/command-center/TerritoryGapPanel";
import CampaignPerformancePanel from "@/components/command-center/CampaignPerformancePanel";
import RecentEventsFeed from "@/components/command-center/RecentEventsFeed";
import { SniperTargetDrawer } from "@/components/sniper/SniperTargetDrawer";
import { SniperCsvImport } from "@/components/sniper/SniperCsvImport";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PageSniperCommandCenter() {
  const { viewModel, loading, filters, setFilters, refresh, cities, categories } = useCommandCenterData();
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 space-y-4">
      <TopCommandBar
        filters={filters}
        onFiltersChange={setFilters}
        cities={cities}
        categories={categories}
        onImport={() => setShowImport(true)}
        onRefresh={refresh}
      />

      <KpiStrip kpis={viewModel.kpis} />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement du Command Center…</div>
      ) : (
        <>
          {/* Desktop: 12-col grid. Left 8: Hot+Pipeline. Right 4: Rep+Events */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <HotLeadsPanel leads={viewModel.hotLeads} onSelect={setDrawerTargetId} />
              <PipelineBoard columns={viewModel.pipeline} onSelect={setDrawerTargetId} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <RepActionQueue actions={viewModel.repActions} onSelect={setDrawerTargetId} />
              <RecentEventsFeed events={viewModel.recentEvents} />
            </div>
          </div>

          {/* Bottom full width */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TerritoryGapPanel rows={viewModel.territoryGaps} />
            <CampaignPerformancePanel rows={viewModel.campaignPerformance} />
          </div>
        </>
      )}

      <SniperTargetDrawer
        targetId={drawerTargetId}
        open={!!drawerTargetId}
        onClose={() => setDrawerTargetId(null)}
        onRefresh={refresh}
      />

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <SniperCsvImport onImported={() => { setShowImport(false); refresh(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
