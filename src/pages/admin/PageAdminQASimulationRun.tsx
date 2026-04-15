import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BannerSimulationEnvironment from "@/components/qa-simulation/BannerSimulationEnvironment";
import PanelSimulationResultSummary from "@/components/qa-simulation/PanelSimulationResultSummary";
import TimelineSimulationExecution from "@/components/qa-simulation/TimelineSimulationExecution";
import TableSimulationEvents from "@/components/qa-simulation/TableSimulationEvents";
import TableSimulationErrors from "@/components/qa-simulation/TableSimulationErrors";
import PanelSimulationManualOverride from "@/components/qa-simulation/PanelSimulationManualOverride";
import PanelEmailSequencePreview from "@/components/qa-simulation/PanelEmailSequencePreview";
import PanelPaymentWebhookStatus from "@/components/qa-simulation/PanelPaymentWebhookStatus";
import PanelProfileCreationStatus from "@/components/qa-simulation/PanelProfileCreationStatus";
import {
  useSimulationRun,
  useSimulationSteps,
  useSimulationEvents,
  useSimulationErrors,
  useRetryStep,
  useCancelRun,
} from "@/hooks/useQASimulation";

export default function PageAdminQASimulationRun() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: run, isLoading: runLoading } = useSimulationRun(runId);
  const { data: steps = [] } = useSimulationSteps(runId);
  const { data: events = [] } = useSimulationEvents(runId);
  const { data: errors = [] } = useSimulationErrors(runId);
  const retryStep = useRetryStep();
  const cancelRun = useCancelRun();

  if (runLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm text-muted-foreground">Simulation introuvable</p>
        <Button variant="ghost" onClick={() => navigate("/admin/qa-simulation")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
        {/* Header */}
        <div className="pt-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/qa-simulation")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground font-display truncate">
              {run.run_name || "Simulation"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {run.started_at ? new Date(run.started_at).toLocaleString("fr-CA") : ""}
            </p>
          </div>
        </div>

        <BannerSimulationEnvironment environment={run.environment} />
        <PanelSimulationResultSummary run={run} steps={steps} />

        {/* Timeline */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Exécution</h2>
          <TimelineSimulationExecution
            steps={steps}
            onRetryStep={(id) => retryStep.mutate({ stepId: id })}
          />
        </div>

        {/* Specialized panels */}
        <PanelEmailSequencePreview runId={run.id} />
        <PanelPaymentWebhookStatus runId={run.id} />
        <PanelProfileCreationStatus runId={run.id} />

        {/* Events */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Événements</h2>
          <TableSimulationEvents events={events} />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Erreurs</h2>
            <TableSimulationErrors errors={errors} />
          </div>
        )}

        <PanelSimulationManualOverride
          runStatus={run.status}
          onCancel={() => cancelRun.mutate(run.id)}
          isCancelling={cancelRun.isPending}
        />
      </div>
    </div>
  );
}
