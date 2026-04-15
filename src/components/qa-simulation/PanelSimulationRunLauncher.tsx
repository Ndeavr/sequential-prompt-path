import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { useSimulationScenarios, useLaunchSimulation } from "@/hooks/useQASimulation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function PanelSimulationRunLauncher() {
  const { data: scenarios = [] } = useSimulationScenarios();
  const launch = useLaunchSimulation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scenarioId, setScenarioId] = useState("");
  const [environment, setEnvironment] = useState("test");

  const handleLaunch = async () => {
    if (!scenarioId) return;
    try {
      const runId = await launch.mutateAsync({ scenarioId, environment });
      toast({ title: "Simulation terminée", description: "Voir les résultats" });
      navigate(`/admin/qa-simulation/run/${runId}`);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Lancer une simulation</h3>
      <div className="space-y-2">
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="w-full rounded-lg bg-muted/30 border border-border/50 px-3 py-2 text-sm text-foreground"
        >
          <option value="">Choisir un scénario…</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full rounded-lg bg-muted/30 border border-border/50 px-3 py-2 text-sm text-foreground"
        >
          <option value="test">Test</option>
          <option value="staging">Staging</option>
          <option value="safe-production">Safe Production</option>
        </select>
      </div>
      <Button onClick={handleLaunch} disabled={!scenarioId || launch.isPending} className="w-full">
        {launch.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {launch.isPending ? "Exécution en cours…" : "Lancer la simulation"}
      </Button>
    </div>
  );
}
