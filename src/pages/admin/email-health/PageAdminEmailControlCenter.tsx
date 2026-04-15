import { useState, useEffect } from "react";
import { Loader2, PlayCircle, Shield, Mail, BarChart3, AlertTriangle, CheckCircle, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useEmailDomainHealth,
  useEmailWarmupSchedule,
  useCheckDomainHealth,
  useInitWarmup,
  useAnalyzeSpamRisk,
} from "@/hooks/useEmailProductionControl";

const STATUS_BADGE: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  ready: { label: "READY", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  limited: { label: "LIMITED", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle },
  blocked: { label: "BLOCKED", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  pending: { label: "PENDING", color: "bg-muted text-muted-foreground border-border", icon: Loader2 },
};

const CHECK_ICON: Record<string, { icon: typeof CheckCircle; color: string }> = {
  passed: { icon: CheckCircle, color: "text-emerald-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  failed: { icon: XCircle, color: "text-destructive" },
  unknown: { icon: AlertTriangle, color: "text-muted-foreground" },
};

const PageAdminEmailControlCenter = () => {
  const { data: health, isLoading } = useEmailDomainHealth();
  const { data: warmup } = useEmailWarmupSchedule();
  const checkMutation = useCheckDomainHealth();
  const initWarmupMutation = useInitWarmup();
  const spamMutation = useAnalyzeSpamRisk();
  const [spamResult, setSpamResult] = useState<any>(null);

  useEffect(() => {
    if (!health) {
      checkMutation.mutate("mail.unpro.ca");
    }
  }, [health]);

  const handleCheck = () => {
    checkMutation.mutate("mail.unpro.ca", {
      onSuccess: () => toast.success("Vérification terminée"),
      onError: () => toast.error("Erreur de vérification"),
    });
  };

  const handleInitWarmup = () => {
    initWarmupMutation.mutate("mail.unpro.ca", {
      onSuccess: () => toast.success("Warmup initialisé"),
      onError: () => toast.error("Erreur warmup"),
    });
  };

  const handleSpamCheck = () => {
    spamMutation.mutate("mail.unpro.ca", {
      onSuccess: (d) => setSpamResult(d),
      onError: () => toast.error("Erreur analyse spam"),
    });
  };

  const statusInfo = STATUS_BADGE[health?.status || "pending"];
  const StatusIcon = statusInfo.icon;

  const todayWarmup = warmup?.find(
    (w: any) => w.scheduled_date === new Date().toISOString().split("T")[0]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Email Production Control Center</h1>
            <p className="text-sm text-muted-foreground">mail.unpro.ca — Monitoring & contrôle</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusInfo.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </div>
        </div>

        {/* Domain Health Panel */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Santé du domaine</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleCheck} disabled={checkMutation.isPending} className="gap-1.5">
              {checkMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Vérifier
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : health ? (
            <>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-foreground">{health.overall_score}</div>
                <div className="text-sm text-muted-foreground">/100</div>
                <Progress value={health.overall_score} className="flex-1 h-2" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "DKIM", status: health.dkim_status },
                  { label: "SPF", status: health.spf_status },
                  { label: "DMARC", status: health.dmarc_status },
                ].map((c) => {
                  const info = CHECK_ICON[c.status] || CHECK_ICON.unknown;
                  const Icon = info.icon;
                  return (
                    <div key={c.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      <span className="text-sm font-medium text-foreground">{c.label}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground truncate">{health.domain}</span>
                </div>
              </div>
              {health.dmarc_policy && (
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 font-mono break-all">
                  {health.dmarc_policy}
                </div>
              )}
              {health.dmarc_status !== "passed" && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-600">DMARC non enforced</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ajouter: <code className="bg-muted px-1 rounded text-[10px]">v=DMARC1; p=quarantine; rua=mailto:admin@unpro.ca</code>
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">Aucune donnée — lancez une vérification</div>
          )}
        </div>

        {/* Warmup Panel */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Warmup Email</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleInitWarmup} disabled={initWarmupMutation.isPending} className="gap-1.5">
              {initWarmupMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Initialiser
            </Button>
          </div>

          {todayWarmup ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Jour {todayWarmup.day_number}</span>
                <span className="font-medium text-foreground">{todayWarmup.sent_count} / {todayWarmup.max_emails}</span>
              </div>
              <Progress value={(todayWarmup.sent_count / todayWarmup.max_emails) * 100} className="h-2" />
              <div className="grid grid-cols-3 gap-2">
                {warmup?.slice(0, 6).map((w: any) => (
                  <div key={w.id} className={`text-center p-2 rounded-lg text-xs ${w.day_number === todayWarmup.day_number ? 'bg-primary/10 border border-primary/20 font-bold text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                    J{w.day_number}: {w.max_emails}
                  </div>
                ))}
              </div>
            </div>
          ) : warmup && warmup.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {warmup.map((w: any) => (
                <div key={w.id} className="text-center p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                  J{w.day_number}: {w.max_emails}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">Aucun warmup — initialisez le plan</div>
          )}
        </div>

        {/* Spam Risk */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Analyse Spam Risk</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleSpamCheck} disabled={spamMutation.isPending} className="gap-1.5">
              {spamMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Analyser
            </Button>
          </div>

          {spamResult ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                spamResult.risk_level === "high" ? "bg-destructive/10 border-destructive/20 text-destructive" :
                spamResult.risk_level === "medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-600" :
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              }`}>
                {spamResult.risk_level === "high" ? <XCircle className="h-4 w-4" /> :
                 spamResult.risk_level === "medium" ? <AlertTriangle className="h-4 w-4" /> :
                 <CheckCircle className="h-4 w-4" />}
                <span className="text-sm font-semibold uppercase">{spamResult.risk_level}</span>
              </div>
              {spamResult.reasons?.length > 0 && (
                <ul className="space-y-1">
                  {spamResult.reasons.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground italic">{spamResult.recommended_action}</p>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">Lancez une analyse pour voir les résultats</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageAdminEmailControlCenter;
