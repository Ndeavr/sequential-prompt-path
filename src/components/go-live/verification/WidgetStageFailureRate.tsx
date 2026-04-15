import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StageData {
  stage: string;
  total: number;
  failed: number;
}

export default function WidgetStageFailureRate({ stages }: { stages: StageData[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Taux d'échec par étape</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((s) => {
          const rate = s.total > 0 ? Math.round((s.failed / s.total) * 100) : 0;
          return (
            <div key={s.stage} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{s.stage}</span>
                <span className={rate > 50 ? "text-red-400 font-medium" : rate > 0 ? "text-orange-400" : "text-green-400"}>
                  {rate}% ({s.failed}/{s.total})
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${rate > 50 ? "bg-red-500" : rate > 0 ? "bg-orange-500" : "bg-green-500"}`}
                  style={{ width: `${100 - rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
