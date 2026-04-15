import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelSimulationScenarioSelector from "@/components/qa-simulation/PanelSimulationScenarioSelector";

export default function PageAdminQASimulationTemplates() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="pt-6 flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/qa-simulation")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground font-display">Scénarios de simulation</h1>
        </div>
        <PanelSimulationScenarioSelector />
      </div>
    </div>
  );
}
