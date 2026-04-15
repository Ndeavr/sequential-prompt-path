import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SimulationRun } from "@/hooks/useQASimulation";

interface Props {
  run: SimulationRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ModalSimulationRunDetails({ run, open, onOpenChange }: Props) {
  if (!run) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{run.run_name || "Détails de la simulation"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground">Statut</p>
              <p className="font-medium text-foreground">{run.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="font-medium text-foreground">{run.health_score}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Environnement</p>
              <p className="font-medium text-foreground">{run.environment}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Démarré</p>
              <p className="font-medium text-foreground">
                {run.started_at ? new Date(run.started_at).toLocaleString("fr-CA") : "—"}
              </p>
            </div>
          </div>
          {run.notes && (
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="text-foreground">{run.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
