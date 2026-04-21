import type { AippAuditViewModel } from "@/types/aippReal";
import { CheckCircle } from "lucide-react";

export default function AippStrengthsCard({ model }: { model: AippAuditViewModel }) {
  if (model.strengths.length === 0) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold">Ce qui vous aide déjà</h3>
      <p className="text-xs text-muted-foreground">
        Vous partez d'une base réelle. L'objectif est maintenant de transformer cette base en visibilité et en rendez-vous.
      </p>
      <div className="space-y-2">
        {model.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">{s.title}</p>
              {s.body && <p className="text-xs text-muted-foreground">{s.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
