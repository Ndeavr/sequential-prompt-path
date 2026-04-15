import HeroSectionOperationalSimulation from "@/components/qa-simulation/HeroSectionOperationalSimulation";
import PanelSimulationRunLauncher from "@/components/qa-simulation/PanelSimulationRunLauncher";
import TableSimulationRuns from "@/components/qa-simulation/TableSimulationRuns";
import WidgetCriticalFailures from "@/components/qa-simulation/WidgetCriticalFailures";
import WidgetFunnelDropoffSummary from "@/components/qa-simulation/WidgetFunnelDropoffSummary";
import WidgetConversionPathIntegrity from "@/components/qa-simulation/WidgetConversionPathIntegrity";
import { useSimulationRuns } from "@/hooks/useQASimulation";

export default function PageAdminQASimulation() {
  const { data: runs = [], isLoading } = useSimulationRuns();
  const latestRun = runs[0];
  const latestSteps = [] as any[]; // Steps loaded on detail page

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <HeroSectionOperationalSimulation />

        {/* Quick stats from latest run */}
        {latestRun && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <WidgetCriticalFailures count={latestRun.critical_failures_count} />
            <WidgetFunnelDropoffSummary steps={latestSteps} />
            <WidgetConversionPathIntegrity steps={latestSteps} />
          </div>
        )}

        <div className="space-y-4">
          <PanelSimulationRunLauncher />
          
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Historique des simulations</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse text-center py-8">Chargement…</p>
            ) : (
              <TableSimulationRuns runs={runs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
