/**
 * UNPRO — Command Center Territories Sub-Page
 */
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import TerritoryGapPanel from "@/components/command-center/TerritoryGapPanel";
import KpiStrip from "@/components/command-center/KpiStrip";

export default function PageCommandCenterTerritories() {
  const { viewModel, loading } = useCommandCenterData();

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Territoires</h1>
        <p className="text-xs text-muted-foreground">Analyse des gaps territoriaux et allocation</p>
      </div>
      <KpiStrip kpis={viewModel.kpis} />
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <TerritoryGapPanel rows={viewModel.territoryGaps} />
      )}
    </div>
  );
}
