import { Mail, Eye, MousePointer, MessageSquare, CheckCircle, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Results {
  total_emails_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_converted: number;
  revenue_generated: number;
}

export default function Dashboard36hStrikeKPI({ results }: { results: Results | null }) {
  const r = results ?? { total_emails_sent: 0, total_opened: 0, total_clicked: 0, total_replied: 0, total_converted: 0, revenue_generated: 0 };

  const kpis = [
    { label: "Envoyés", value: r.total_emails_sent, icon: Mail, color: "text-blue-400" },
    { label: "Ouverts", value: r.total_opened, icon: Eye, color: "text-cyan-400", rate: r.total_emails_sent > 0 ? `${((r.total_opened / r.total_emails_sent) * 100).toFixed(0)}%` : "—" },
    { label: "Cliqués", value: r.total_clicked, icon: MousePointer, color: "text-amber-400", rate: r.total_opened > 0 ? `${((r.total_clicked / r.total_opened) * 100).toFixed(0)}%` : "—" },
    { label: "Répondus", value: r.total_replied, icon: MessageSquare, color: "text-purple-400" },
    { label: "Convertis", value: r.total_converted, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Revenus", value: `${r.revenue_generated} $`, icon: DollarSign, color: "text-green-400" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((k) => (
        <Card key={k.label} className="p-3 bg-card/50 border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</span>
          </div>
          <div className="text-lg font-bold text-foreground">{k.value}</div>
          {"rate" in k && k.rate && <div className="text-[10px] text-muted-foreground">{k.rate}</div>}
        </Card>
      ))}
    </div>
  );
}
