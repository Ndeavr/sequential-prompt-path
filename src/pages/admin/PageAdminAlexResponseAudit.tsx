/**
 * PageAdminAlexResponseAudit — Admin page for auditing Alex responses
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, Eye } from "lucide-react";

interface ResponseLog {
  id: string;
  raw_response: string;
  final_status: string;
  rewrite_applied: boolean;
  rewritten_response: string | null;
  blocked_patterns_detected: string[] | null;
  hallucination_detected: boolean;
  hallucination_terms: string[] | null;
  original_message: string | null;
  created_at: string;
}

interface HallucinationFlag {
  id: string;
  detected_terms: string[];
  severity: string;
  auto_corrected: boolean;
  corrected_response: string | null;
  created_at: string;
}

export default function PageAdminAlexResponseAudit() {
  const [logs, setLogs] = useState<ResponseLog[]>([]);
  const [flags, setFlags] = useState<HallucinationFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [logsRes, flagsRes] = await Promise.all([
      supabase
        .from("alex_response_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("alex_hallucination_flags")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setLogs((logsRes.data as any[]) ?? []);
    setFlags((flagsRes.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const hallucinationCount = flags.length;
  const correctedCount = flags.filter(f => f.auto_corrected).length;
  const criticalCount = flags.filter(f => f.severity === "high" || f.severity === "critical").length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Alex — Audit Réponses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Surveillance des hallucinations et validation des réponses
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Réponses loguées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{hallucinationCount}</p>
            <p className="text-xs text-muted-foreground">Hallucinations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{correctedCount}</p>
            <p className="text-xs text-muted-foreground">Auto-corrigées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </CardContent>
        </Card>
      </div>

      {/* Hallucination Flags */}
      {flags.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Hallucinations Détectées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {flags.map(flag => (
              <div key={flag.id} className={`rounded-lg border p-3 text-sm ${
                flag.severity === "high" || flag.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-500/20 bg-amber-500/5"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={flag.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {flag.severity.toUpperCase()}
                  </Badge>
                  {flag.auto_corrected && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                      ✓ Auto-corrigé
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Termes : <span className="text-foreground font-medium">{flag.detected_terms.join(", ")}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(flag.created_at).toLocaleString("fr-CA")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Response Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des réponses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune réponse loguée</p>
          )}
          {logs.map(log => (
            <div
              key={log.id}
              className="rounded-lg border border-border/50 p-3 hover:border-border transition-colors cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {log.hallucination_detected ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  <Badge variant="outline" className="text-[10px]">{log.final_status}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("fr-CA")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.raw_response}</p>
              {expandedId === log.id && (
                <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                  {log.original_message && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground">Message utilisateur :</p>
                      <p className="text-xs text-foreground">{log.original_message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">Réponse brute :</p>
                    <p className="text-xs text-foreground">{log.raw_response}</p>
                  </div>
                  {log.rewritten_response && (
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400">Réponse corrigée :</p>
                      <p className="text-xs text-foreground">{log.rewritten_response}</p>
                    </div>
                  )}
                  {log.hallucination_terms && log.hallucination_terms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.hallucination_terms.map(t => (
                        <Badge key={t} variant="destructive" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
