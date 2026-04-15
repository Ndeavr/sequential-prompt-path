import { MousePointerClick, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  score: number;
}

const SIGNALS = [
  { label: "CTA visible et clair", threshold: 25 },
  { label: "Numéro de téléphone affiché", threshold: 45 },
  { label: "Email de contact visible", threshold: 60 },
  { label: "Tarification ou estimation visible", threshold: 80 },
  { label: "Preuves de confiance (certifications, assurances)", threshold: 100 },
];

export default function PanelConversionIntelligence({ score }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MousePointerClick className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Conversion</h3>
        <span className="ml-auto text-lg font-bold text-foreground">{score}/100</span>
      </div>
      <div className="space-y-2">
        {SIGNALS.map((s) => {
          const pass = score >= s.threshold;
          return (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              {pass ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span className={pass ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
