import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Search, Upload, Mail, CreditCard, CheckCircle2, AlertTriangle, XCircle,
  Users, TrendingUp, Activity
} from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  status: "ok" | "warning" | "error";
  navigateTo?: string;
}

function MetricCard({ label, value, icon: Icon, status, navigateTo }: MetricCardProps) {
  const navigate = useNavigate();
  const statusColors = {
    ok: "text-emerald-400",
    warning: "text-amber-400",
    error: "text-red-400",
  };

  return (
    <Card
      className={navigateTo ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}
      onClick={() => navigateTo && navigate(navigateTo)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-3.5 w-3.5 ${statusColors[status]}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-xl font-black text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

// Mock data — replace with real queries
const metrics = {
  prospects_imported: 47,
  gmb_match_rate: 82,
  enrichments_success: 39,
  emails_sent: 156,
  emails_failed: 3,
  responses: 12,
  plans_selected: 8,
  payments_success: 5,
  activations: 4,
  blocked: 2,
};

export default function DashboardGoLiveControlCenter() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Métriques temps réel
        </h2>
        <Badge variant="outline" className="text-[10px]">Live</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetricCard label="Prospects" value={metrics.prospects_imported} icon={Users} status="ok" navigateTo="/admin/prospects" />
        <MetricCard label="Match GMB" value={metrics.gmb_match_rate} icon={Search} status={metrics.gmb_match_rate > 70 ? "ok" : "warning"} />
        <MetricCard label="Enrichis" value={metrics.enrichments_success} icon={Upload} status="ok" />
        <MetricCard label="Emails envoyés" value={metrics.emails_sent} icon={Mail} status="ok" navigateTo="/admin/outbound" />
        <MetricCard label="Emails failed" value={metrics.emails_failed} icon={XCircle} status={metrics.emails_failed > 5 ? "error" : "warning"} navigateTo="/admin/outbound" />
        <MetricCard label="Réponses" value={metrics.responses} icon={TrendingUp} status="ok" />
        <MetricCard label="Plans choisis" value={metrics.plans_selected} icon={CheckCircle2} status="ok" />
        <MetricCard label="Paiements" value={metrics.payments_success} icon={CreditCard} status="ok" navigateTo="/admin/payments" />
        <MetricCard label="Activations" value={metrics.activations} icon={CheckCircle2} status="ok" />
        <MetricCard label="Bloqués" value={metrics.blocked} icon={AlertTriangle} status={metrics.blocked > 0 ? "warning" : "ok"} />
      </div>
    </div>
  );
}
