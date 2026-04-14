import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export default function WidgetExtractionProgress({ total, approved, pending, rejected }: Props) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progression</p>
          <span className="text-lg font-bold text-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span className="text-success">{approved} approuvés</span>
          <span className="text-warning">{pending} en revue</span>
          <span className="text-destructive">{rejected} rejetés</span>
        </div>
      </CardContent>
    </Card>
  );
}
