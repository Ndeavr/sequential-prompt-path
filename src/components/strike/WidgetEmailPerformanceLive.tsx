import { TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Results {
  total_emails_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
}

export default function WidgetEmailPerformanceLive({ results }: { results: Results | null }) {
  const r = results ?? { total_emails_sent: 0, total_opened: 0, total_clicked: 0, total_replied: 0 };

  const openRate = r.total_emails_sent > 0 ? (r.total_opened / r.total_emails_sent) * 100 : 0;
  const clickRate = r.total_opened > 0 ? (r.total_clicked / r.total_opened) * 100 : 0;
  const replyRate = r.total_emails_sent > 0 ? (r.total_replied / r.total_emails_sent) * 100 : 0;

  const metrics = [
    { label: "Taux ouverture", value: openRate, threshold: 20, color: openRate >= 20 ? "bg-emerald-500" : "bg-red-500" },
    { label: "Taux clic", value: clickRate, threshold: 5, color: clickRate >= 5 ? "bg-cyan-500" : "bg-orange-500" },
    { label: "Taux réponse", value: replyRate, threshold: 3, color: replyRate >= 3 ? "bg-purple-500" : "bg-amber-500" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-foreground">Performance Email</h3>
      </div>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-mono font-medium text-foreground">{m.value.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(m.value, 100)} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
