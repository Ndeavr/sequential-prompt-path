import { Shield, TrendingUp, ClipboardList, FileText, DollarSign } from "lucide-react";
import type { DiagnosticAction } from "@/lib/condoDiagnosticScoring";

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, TrendingUp, ClipboardList, FileText, DollarSign,
};

const URGENCY_STYLES = {
  immediate: "border-destructive/30 bg-destructive/5",
  soon: "border-accent/30 bg-accent/5",
  planned: "border-border/50 bg-muted/30",
};

const URGENCY_LABELS = {
  immediate: "Immédiat",
  soon: "Bientôt",
  planned: "Planifié",
};

interface Props {
  action: DiagnosticAction;
  index: number;
  locked?: boolean;
}

export default function CardDiagnosticPriorityAction({ action, index, locked }: Props) {
  const Icon = ICON_MAP[action.icon] || Shield;

  return (
    <div className={`relative flex gap-3 p-4 rounded-xl border transition-all ${
      locked ? "opacity-50 blur-[1px]" : URGENCY_STYLES[action.urgency]
    }`}>
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            action.urgency === "immediate" ? "bg-destructive/10 text-destructive" :
            action.urgency === "soon" ? "bg-accent/10 text-accent" :
            "bg-muted text-muted-foreground"
          }`}>
            {URGENCY_LABELS[action.urgency]}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{action.title}</p>
        <p className="text-xs text-muted-foreground">{action.description}</p>
      </div>
    </div>
  );
}
