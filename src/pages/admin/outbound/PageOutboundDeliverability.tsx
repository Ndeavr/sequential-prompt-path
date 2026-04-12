import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { useDeliverabilityScores } from "@/hooks/useOutboundEliteData";

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const bgColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Moyen" : "Critique";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className={color}
            strokeDasharray={`${score * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <Badge className={`${bgColor} text-white`}>{label}</Badge>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const v = level === "low" ? "default" : level === "medium" ? "secondary" : "destructive";
  const l = level === "low" ? "Faible" : level === "medium" ? "Moyen" : "Élevé";
  return <Badge variant={v}>{l}</Badge>;
}

export default function PageOutboundDeliverability() {
  const { data: scores, isLoading } = useDeliverabilityScores();
  const latestScore = scores?.[0];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Deliverability Scoring</h1>
          <p className="text-sm text-muted-foreground">Score en temps réel — inbox placement prediction</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Global de Délivrabilité</CardTitle>
          <CardDescription>Basé sur : Authentication (40%) · Alignment (20%) · Réputation (15%) · Comportement (15%) · Contenu (10%)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Calcul…</p>
          ) : !latestScore ? (
            <div className="text-center py-8">
              <ScoreGauge score={0} />
              <p className="text-sm text-muted-foreground mt-4">Aucun score calculé. Lancez un audit.</p>
              <Button className="mt-3"><Activity className="h-4 w-4 mr-2" /> Calculer le score</Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ScoreGauge score={latestScore.score} />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <MetricCard label="SPF" ok={latestScore.spf_ok} />
                <MetricCard label="DKIM" ok={latestScore.dkim_ok} />
                <MetricCard label="DMARC" ok={latestScore.dmarc_ok} />
                <MetricCard label="Risque" value={<RiskBadge level={latestScore.risk_level} />} />
                <StatCard label="Open Rate" value={`${latestScore.open_rate}%`} />
                <StatCard label="Reply Rate" value={`${latestScore.reply_rate}%`} />
                <StatCard label="Bounce Rate" value={`${latestScore.bounce_rate}%`} warn={Number(latestScore.bounce_rate) > 5} />
                <StatCard label="Complaint" value={`${latestScore.complaint_rate}%`} warn={Number(latestScore.complaint_rate) > 0.1} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des scores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !scores?.length ? (
            <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
          ) : (
            <div className="space-y-2">
              {scores.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-mono">{s.domain}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-CA")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge level={s.risk_level} />
                    <span className="text-lg font-bold">{s.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, ok, value }: { label: string; ok?: boolean; value?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border bg-card flex items-center gap-2">
      {value ? value : ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border bg-card ${warn ? "border-red-500/30" : ""}`}>
      <p className={`text-sm font-bold ${warn ? "text-red-500" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
