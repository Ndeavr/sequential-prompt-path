import { Button } from "@/components/ui/button";
import { Ban, RotateCcw } from "lucide-react";

interface Props {
  runStatus: string;
  onCancel: () => void;
  isCancelling: boolean;
}

export default function PanelSimulationManualOverride({ runStatus, onCancel, isCancelling }: Props) {
  if (runStatus === "cancelled" || runStatus === "passed") return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Actions manuelles</h3>
      {(runStatus === "running" || runStatus === "failed") && (
        <Button variant="destructive" size="sm" onClick={onCancel} disabled={isCancelling} className="w-full">
          <Ban className="w-4 h-4 mr-2" />
          Annuler la simulation
        </Button>
      )}
    </div>
  );
}
