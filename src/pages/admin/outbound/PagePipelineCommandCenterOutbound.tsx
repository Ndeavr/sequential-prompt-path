import AdminLayout from "@/layouts/AdminLayout";
import { Activity, AlertTriangle, CheckCircle2, XCircle, Zap, Clock, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { usePipelineLiveOverview } from "@/hooks/usePipelineCommandCenter";
import WidgetKpiCounter from "@/components/admin/pipeline-cc/WidgetKpiCounter";
import TablePipelineExecutions from "@/components/admin/pipeline-cc/TablePipelineExecutions";
import TableBlockedItemsRecovery from "@/components/admin/pipeline-cc/TableBlockedItemsRecovery";
import WidgetDependencyHealthGrid from "@/components/admin/pipeline-cc/WidgetDependencyHealthGrid";
import PanelPipelineStageOverview from "@/components/admin/pipeline-cc/PanelPipelineStageOverview";

function fmtDuration(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function PagePipelineCommandCenterOutbound() {
  const { data, isLoading, isError, refetch, isFetching } = usePipelineLiveOverview();

  return (
    <AdminLayout>
      <div className="space-y-4 p-3 md:p-6 max-w-7xl mx-auto pb-20">
        {/* Hero */}
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/15 shrink-0">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold font-display truncate">Pipeline Live</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Vue temps réel — runs, blocages, dépendances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${isFetching ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                {isFetching ? "Sync…" : "Live"}
              </span>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs px-2">
                <Link to="/admin/outbound/blockers">Blocages</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs px-2">
                <Link to="/admin/outbound/health">Santé</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : isError ? (
          <Card><CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Impossible de charger le pipeline</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3">Réessayer</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <WidgetKpiCounter label="Runs actifs" value={data!.kpis.active_runs} icon={Activity} tone="primary" />
            <WidgetKpiCounter label="Réussis 24h" value={data!.kpis.succeeded_24h} icon={CheckCircle2} tone="success" />
            <WidgetKpiCounter label="Échecs 24h" value={data!.kpis.failed_24h} icon={XCircle} tone="danger" />
            <WidgetKpiCounter label="Bloqués" value={data!.kpis.blocked_items} icon={AlertTriangle} tone="warning" />
            <WidgetKpiCounter label="Critiques" value={data!.kpis.critical_blockers} icon={Shield} tone="danger" />
            <WidgetKpiCounter label="Durée moy." value={fmtDuration(data!.kpis.avg_run_duration_seconds)} icon={Clock} />
          </div>
        )}

        {/* Tabs */}
        {!isLoading && !isError && data && (
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="live" className="text-xs">Live</TabsTrigger>
              <TabsTrigger value="blockers" className="text-xs">
                Blocages
                {data.kpis.blocked_items > 0 && (
                  <span className="ml-1 px-1 rounded bg-amber-500/20 text-amber-300 text-[10px]">{data.kpis.blocked_items}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="stages" className="text-xs">Étapes</TabsTrigger>
              <TabsTrigger value="health" className="text-xs">Santé</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-3 mt-3">
              <TablePipelineExecutions runs={data.active_runs} />
            </TabsContent>

            <TabsContent value="blockers" className="space-y-3 mt-3">
              <TableBlockedItemsRecovery blockers={data.open_blockers} />
            </TabsContent>

            <TabsContent value="stages" className="space-y-3 mt-3">
              <PanelPipelineStageOverview stages={data.stage_metrics} />
            </TabsContent>

            <TabsContent value="health" className="space-y-3 mt-3">
              <WidgetDependencyHealthGrid dependencies={data.dependencies} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
