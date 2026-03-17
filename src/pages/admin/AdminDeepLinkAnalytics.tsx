/**
 * UNPRO — Deep Link Analytics Dashboard
 */
import { useDeepLinkAnalytics } from "@/hooks/useDeepLinkAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Eye, MousePointerClick, UserCheck, QrCode, Target, TrendingUp } from "lucide-react";

const METRIC_CARDS = [
  { key: "totalScans", label: "Scans QR", icon: QrCode, color: "text-blue-500" },
  { key: "totalLandingViews", label: "Vues landing", icon: Eye, color: "text-violet-500" },
  { key: "totalCtaClicks", label: "Clics CTA", icon: MousePointerClick, color: "text-amber-500" },
  { key: "totalAuthCompleted", label: "Auth complétées", icon: UserCheck, color: "text-emerald-500" },
  { key: "totalConversions", label: "Conversions", icon: Target, color: "text-red-500" },
] as const;

export default function AdminDeepLinkAnalytics() {
  const { data: metrics, isLoading } = useDeepLinkAnalytics();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics Deep Links</h1>
            <p className="text-sm text-muted-foreground">Performance du funnel QR → Conversion</p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {METRIC_CARDS.map(({ key, label, icon: Icon, color }) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : (metrics as any)?.[key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel rates */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Taux de conversion</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FunnelBar label="Taux CTA" value={metrics?.ctaRate ?? 0} />
            <FunnelBar label="Taux auth" value={metrics?.authCompletionRate ?? 0} />
            <FunnelBar label="Taux conversion" value={metrics?.conversionRate ?? 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
