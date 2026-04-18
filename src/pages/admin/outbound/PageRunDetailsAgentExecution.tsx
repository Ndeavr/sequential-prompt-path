import { useParams, Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { ArrowLeft, Activity, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineRunDetail } from "@/hooks/usePipelineCommandCenter";
import PanelRunSummary from "@/components/admin/pipeline-cc/PanelRunSummary";
import TimelineRunLifecycle from "@/components/admin/pipeline-cc/TimelineRunLifecycle";
import PanelStepExecutionLogs from "@/components/admin/pipeline-cc/PanelStepExecutionLogs";
import PanelRetryActions from "@/components/admin/pipeline-cc/PanelRetryActions";
import TableBlockedItemsRecovery from "@/components/admin/pipeline-cc/TableBlockedItemsRecovery";

export default function PageRunDetailsAgentExecution() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePipelineRunDetail(runId);

  return (
    <AdminLayout>
      <div className="space-y-3 p-3 md:p-6 max-w-5xl mx-auto pb-20">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-bold font-display flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Run · {runId?.slice(0, 8)}</span>
            </h1>
            <p className="text-[11px] text-muted-foreground">Détail d'exécution temps réel</p>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        ) : isError || !data || (data as any).error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {(data as any)?.error === "run_not_found" ? "Run introuvable" : "Impossible de charger le run"}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => refetch()}>Réessayer</Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/outbound/runs">Retour</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <PanelRunSummary detail={data} />

            <PanelRetryActions runId={data.run.id} status={data.run.normalized_status} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cycle de vie</CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineRunLifecycle transitions={data.transitions} />
              </CardContent>
            </Card>

            <PanelStepExecutionLogs transitions={data.transitions} />

            <TableBlockedItemsRecovery
              blockers={data.blockers.filter((b: any) => b.status !== "resolved")}
              showRunLink={false}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
