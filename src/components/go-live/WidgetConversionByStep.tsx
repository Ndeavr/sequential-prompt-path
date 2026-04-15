import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const steps = [
  { label: "Prospect", count: 100, pct: 100 },
  { label: "GMB Match", count: 82, pct: 82 },
  { label: "Enrichi", count: 68, pct: 68 },
  { label: "Contacté", count: 52, pct: 52 },
  { label: "Engagé", count: 24, pct: 24 },
  { label: "Plan choisi", count: 15, pct: 15 },
  { label: "Payé", count: 10, pct: 10 },
  { label: "Activé", count: 8, pct: 8 },
];

export default function WidgetConversionByStep() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Conversion par étape
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 shrink-0">{step.label}</span>
            <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                style={{ width: `${step.pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-8 text-right">{step.count}</span>
            {i > 0 && (
              <span className="text-[9px] text-muted-foreground w-8">
                {Math.round((step.count / steps[i - 1].count) * 100)}%
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
