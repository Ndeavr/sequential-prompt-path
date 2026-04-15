import { Card, CardContent } from "@/components/ui/card";
import { Mic, Shield, Brain, Zap, AlertTriangle } from "lucide-react";
import { useVoiceRuntimeMetrics, useUnderstandingLogs, useVoiceFallbacks } from "@/hooks/useAlexVoiceEngine";

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-5 ${color}`} />
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WidgetVoiceMetrics() {
  const { data: metrics = [] } = useVoiceRuntimeMetrics(7);
  const { data: logs = [] } = useUnderstandingLogs(100);
  const { data: fallbacks = [] } = useVoiceFallbacks();

  const totalRequests = metrics.reduce((s: number, m: any) => s + (m.requests_count || 0), 0);
  const totalFallbacks = metrics.reduce((s: number, m: any) => s + (m.fallback_count || 0), 0);
  const fallbackRate = totalRequests > 0 ? ((totalFallbacks / totalRequests) * 100).toFixed(1) : "0";

  const avgConfidence = logs.length > 0
    ? (logs.reduce((s: number, l: any) => s + Number(l.understanding_confidence ?? 0), 0) / logs.length * 100).toFixed(0)
    : "—";

  const avgLatency = logs.filter((l: any) => l.total_latency_ms != null).length > 0
    ? Math.round(logs.reduce((s: number, l: any) => s + (l.total_latency_ms ?? 0), 0) / logs.filter((l: any) => l.total_latency_ms != null).length)
    : "—";

  const frenchLogs = logs.filter((l: any) => l.detected_language === "fr");
  const frenchRate = logs.length > 0 ? ((frenchLogs.length / logs.length) * 100).toFixed(0) : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <MetricCard icon={Mic} label="Français détecté" value={`${frenchRate}%`} color="text-blue-400" />
      <MetricCard icon={Brain} label="Compréhension" value={`${avgConfidence}%`} color="text-emerald-400" />
      <MetricCard icon={Shield} label="Fallbacks" value={`${fallbackRate}%`} color="text-amber-400" />
      <MetricCard icon={Zap} label="Latence moy." value={avgLatency === "—" ? "—" : `${avgLatency}ms`} color="text-purple-400" />
      <MetricCard icon={AlertTriangle} label="Requêtes 7j" value={String(totalRequests)} color="text-muted-foreground" />
    </div>
  );
}
