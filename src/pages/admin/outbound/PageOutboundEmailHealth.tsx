import AdminLayout from "@/layouts/AdminLayout";
import { useState } from "react";
import { Shield, Search, AlertTriangle, CheckCircle2, XCircle, Copy, RefreshCw, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useEmailDomainConfigs, useEmailHealthReport, useEmailAuthCheck, useEmailFixRecommendations, useRunEmailAudit } from "@/hooks/useEmailHealthData";

const levelColors: Record<string, string> = {
  excellent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  bon: "bg-green-500/20 text-green-400 border-green-500/30",
  moyen: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  faible: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critique: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusIcon = (status: string) => {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "missing") return <XCircle className="h-4 w-4 text-red-400" />;
  return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
};

export default function PageOutboundEmailHealth() {
  const [domain, setDomain] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>();
  const { data: configs } = useEmailDomainConfigs();
  const { data: report } = useEmailHealthReport(selectedConfigId);
  const { data: authCheck } = useEmailAuthCheck(selectedConfigId);
  const { data: fixes } = useEmailFixRecommendations(selectedConfigId);
  const { mutate: runAudit, isPending, auditResult } = useRunEmailAudit();

  const activeResult = auditResult || (report ? { ...report, spf: null, dkim: null, dmarc: null, alignment: null, issues: report.issues, recommendations: report.recommendations } : null);

  const handleAudit = () => {
    if (!domain.trim()) { toast.error("Entrez un domaine"); return; }
    runAudit({ domain: domain.trim(), from_email: fromEmail || undefined });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Hero */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10"><Shield className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Santé Email & Délivrabilité</h1>
            <p className="text-sm text-muted-foreground">Vérifiez SPF, DKIM, DMARC et l'alignement de vos domaines d'envoi</p>
          </div>
        </div>

        {/* Domain Input */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="domaine.com" value={domain} onChange={e => setDomain(e.target.value)} />
              <Input placeholder="from@domaine.com (optionnel)" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
              <Button onClick={handleAudit} disabled={isPending} className="gap-2">
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isPending ? "Analyse…" : "Lancer l'audit"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Previous domains */}
        {configs && configs.length > 0 && !activeResult && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Domaines vérifiés</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {configs.map((c: any) => (
                <button key={c.id} onClick={() => { setSelectedConfigId(c.id); setDomain(c.domain); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{c.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Score: {c.health_score}/100</span>
                    <Badge className={`text-[10px] ${levelColors[c.health_score >= 90 ? "excellent" : c.health_score >= 75 ? "bon" : c.health_score >= 55 ? "moyen" : c.health_score >= 35 ? "faible" : "critique"]}`}>
                      {c.health_score >= 90 ? "Excellent" : c.health_score >= 75 ? "Bon" : c.health_score >= 55 ? "Moyen" : c.health_score >= 35 ? "Faible" : "Critique"}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {activeResult && (
          <>
            {/* Global Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
                      <circle cx="60" cy="60" r="52" fill="none"
                        stroke={activeResult.overall_score >= 75 ? "#22c55e" : activeResult.overall_score >= 55 ? "#eab308" : "#ef4444"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(activeResult.overall_score / 100) * 327} 327`} />
                    </svg>
                    <span className="absolute text-2xl font-bold">{activeResult.overall_score}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Score Global</h2>
                      <Badge className={levelColors[activeResult.level] || ""}>{activeResult.level}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      {[
                        { label: "Auth", value: activeResult.auth_score },
                        { label: "Alignement", value: activeResult.alignment_score },
                        { label: "Réputation", value: activeResult.reputation_score },
                        { label: "Comportement", value: activeResult.behavior_score },
                        { label: "Contenu", value: activeResult.content_score },
                      ].map(s => (
                        <div key={s.label} className="space-y-1">
                          <div className="flex justify-between"><span className="text-muted-foreground">{s.label}</span><span className="font-medium">{s.value}%</span></div>
                          <Progress value={s.value} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auth checks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "SPF", data: auditResult?.spf || { status: authCheck?.spf_status, record: authCheck?.spf_record, issues: authCheck?.spf_issues } },
                { label: "DKIM", data: auditResult?.dkim || { status: authCheck?.dkim_status, record: authCheck?.dkim_record, issues: authCheck?.dkim_issues } },
                { label: "DMARC", data: auditResult?.dmarc || { status: authCheck?.dmarc_status, record: authCheck?.dmarc_record, issues: authCheck?.dmarc_issues } },
              ].map(({ label, data }) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{label}</CardTitle>
                      {statusIcon(data?.status || "unknown")}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant={data?.status === "pass" ? "default" : data?.status === "missing" ? "destructive" : "secondary"} className="text-[10px]">
                      {data?.status === "pass" ? "Valide" : data?.status === "missing" ? "Manquant" : data?.status === "warning" ? "Attention" : "Inconnu"}
                    </Badge>
                    {data?.record && (
                      <div className="bg-muted/30 rounded-md p-2 text-[11px] font-mono break-all relative group">
                        {data.record.substring(0, 120)}{data.record.length > 120 ? "…" : ""}
                        <button onClick={() => copyToClipboard(data.record)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {(data?.issues as string[])?.length > 0 && (
                      <ul className="text-[11px] text-muted-foreground space-y-0.5">
                        {(data.issues as string[]).map((i: string, idx: number) => <li key={idx}>• {i}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fix Recommendations */}
            {((activeResult.recommendations as any[]) || fixes || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    Corrections recommandées
                  </CardTitle>
                  <CardDescription>Suivez ces étapes pour améliorer votre délivrabilité</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {((activeResult.recommendations as any[]) || fixes || []).map((rec: any, idx: number) => (
                    <div key={idx} className="border border-border/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                          {rec.severity === "critical" ? "Critique" : "Attention"}
                        </Badge>
                        <span className="font-medium text-sm">{rec.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                      {rec.impact && <p className="text-xs"><strong>Impact :</strong> {rec.impact}</p>}
                      {rec.dns_record_to_add && (
                        <div className="bg-muted/30 rounded-md p-2 flex items-center justify-between gap-2">
                          <code className="text-[11px] font-mono break-all">{rec.dns_record_to_add}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(rec.dns_record_to_add)} className="shrink-0">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {rec.fix_instructions && <p className="text-[11px] text-muted-foreground italic">{rec.fix_instructions}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Re-verify */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleAudit} disabled={isPending} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                Relancer la vérification
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  </AdminLayout>
  );
}
