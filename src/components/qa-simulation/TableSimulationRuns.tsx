import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Loader2, Ban } from "lucide-react";
import type { SimulationRun } from "@/hooks/useQASimulation";

const STATUS_ICON: Record<string, React.ReactNode> = {
  passed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  running: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  queued: <Clock className="w-4 h-4 text-muted-foreground" />,
  cancelled: <Ban className="w-4 h-4 text-muted-foreground" />,
};

interface Props {
  runs: SimulationRun[];
}

export default function TableSimulationRuns({ runs }: Props) {
  const navigate = useNavigate();

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Aucune simulation exécutée</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <button
          key={run.id}
          onClick={() => navigate(`/admin/qa-simulation/run/${run.id}`)}
          className="w-full glass-card rounded-lg p-3 text-left hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {STATUS_ICON[run.status] || STATUS_ICON.queued}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {run.simulation_scenarios?.name || run.run_name || "Simulation"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {run.environment} • {new Date(run.created_at).toLocaleString("fr-CA")}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${
                (run.health_score ?? 0) >= 90 ? "text-emerald-400" :
                (run.health_score ?? 0) >= 60 ? "text-yellow-400" : "text-red-400"
              }`}>{run.health_score ?? 0}</p>
              <p className="text-xs text-muted-foreground">score</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
