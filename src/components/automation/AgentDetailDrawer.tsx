import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { AutomationAgent } from "@/services/automationService";

interface Props {
  agent: AutomationAgent | null;
  onClose: () => void;
}

export default function AgentDetailDrawer({ agent, onClose }: Props) {
  if (!agent) return null;

  const fields = [
    { label: "Clé", value: agent.key },
    { label: "Catégorie", value: agent.category },
    { label: "Fréquence", value: `${agent.frequency_type} / ${agent.frequency_value}` },
    { label: "Timezone", value: agent.timezone },
    { label: "Priorité", value: agent.priority },
    { label: "Max jobs/run", value: agent.max_jobs_per_run },
    { label: "Max jobs/jour", value: agent.max_jobs_per_day },
    { label: "Seuil qualité", value: agent.quality_threshold },
    { label: "Seuil duplication", value: agent.duplicate_similarity_threshold },
    { label: "Confiance min", value: agent.min_data_confidence },
    { label: "Revue manuelle", value: agent.requires_manual_review ? "Oui" : "Non" },
    { label: "Dernier run", value: agent.last_run_at ? new Date(agent.last_run_at).toLocaleString("fr-CA") : "—" },
    { label: "Prochain run", value: agent.next_run_at ? new Date(agent.next_run_at).toLocaleString("fr-CA") : "—" },
    { label: "Statut", value: agent.last_status ?? "—" },
  ];

  return (
    <Sheet open={!!agent} onOpenChange={open => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{agent.name}</SheetTitle>
          {agent.description && <p className="text-xs text-muted-foreground">{agent.description}</p>}
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {fields.map(f => (
            <div key={f.label} className="flex justify-between text-sm border-b border-border/30 pb-1.5">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium text-right">{String(f.value)}</span>
            </div>
          ))}
        </div>
        {Object.keys(agent.config).length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Config JSON</p>
            <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-auto max-h-40">
              {JSON.stringify(agent.config, null, 2)}
            </pre>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
