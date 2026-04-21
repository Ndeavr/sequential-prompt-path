import type { AippAuditViewModel } from "@/types/aippReal";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

const icons = {
  validated: CheckCircle,
  in_progress: Loader2,
  unavailable: XCircle,
};
const colors = {
  validated: "text-success",
  in_progress: "text-primary animate-spin",
  unavailable: "text-muted-foreground",
};
const labels = {
  validated: "validé",
  in_progress: "en validation",
  unavailable: "indisponible",
};

export default function AippSourcesCard({ model }: { model: AippAuditViewModel }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold">Sources utilisées</h3>
      <p className="text-xs text-muted-foreground">Votre analyse repose uniquement sur les signaux réellement détectés.</p>
      <div className="space-y-2">
        {model.sources.map(s => {
          const Icon = icons[s.status];
          return (
            <div key={s.key} className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <span className={`inline-flex items-center gap-1 ${colors[s.status]}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs">{labels[s.status]}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
