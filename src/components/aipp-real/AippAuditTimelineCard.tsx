import type { AippAuditViewModel } from "@/types/aippReal";
import { CheckCircle, Clock } from "lucide-react";

const steps = [
  { label: "Analyse lancée", threshold: 0 },
  { label: "Site validé", threshold: 20 },
  { label: "Google validé", threshold: 50 },
  { label: "Confiance validée", threshold: 70 },
  { label: "Score calculé", threshold: 95 },
];

export default function AippAuditTimelineCard({ model }: { model: AippAuditViewModel }) {
  const progress = model.jobProgress || (model.analysisStatus === "complete" ? 100 : 0);

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold">Historique de l'analyse</h3>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const done = progress >= s.threshold + 10;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
