import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStep {
  label: string;
  count: number;
  status: string;
}

export default function WidgetLiveConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map(s => s.count), 1);
  const colors: Record<string, string> = {
    passed: "bg-green-500", partial: "bg-orange-500", failed: "bg-red-500", not_tested: "bg-muted-foreground/30",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Funnel Go-Live</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-mono">{step.count}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colors[step.status]}`}
                style={{ width: `${(step.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
