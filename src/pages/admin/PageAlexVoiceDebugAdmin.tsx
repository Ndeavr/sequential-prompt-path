/**
 * PageAlexVoiceDebugAdmin — Admin diagnostics for voice reliability.
 * Shows provider status, error rates, recent sessions, and configuration.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle, CheckCircle2, XCircle, Mic, Volume2, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface HealthStatus {
  status: string;
  checks: Record<string, { status: string; detail?: string }>;
  metrics_24h: {
    total_sessions: number;
    total_errors: number;
    fallback_uses: number;
    error_rate: string;
  };
  checked_at: string;
}

interface VoiceError {
  id: string;
  provider_name: string;
  module_name: string;
  error_code: string;
  error_message: string;
  http_status: number;
  fallback_applied: boolean;
  created_at: string;
}

interface VoiceSession {
  id: string;
  session_status: string;
  entry_point: string;
  active_tts_provider: string;
  active_stt_provider: string;
  fallback_used: boolean;
  ended_reason: string;
  created_at: string;
}

export default function PageAlexVoiceDebugAdmin() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [errors, setErrors] = useState<VoiceError[]>([]);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Health check
      const { data: healthData } = await supabase.functions.invoke("alex-voice-health");
      if (healthData) setHealth(healthData);

      // Recent errors
      const { data: errorData } = await supabase
        .from("voice_reliability_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (errorData) setErrors(errorData as VoiceError[]);

      // Recent sessions
      const { data: sessionData } = await supabase
        .from("voice_reliability_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (sessionData) setSessions(sessionData as VoiceSession[]);
    } catch (e) {
      console.error("Failed to fetch voice debug data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const statusIcon = (s: string) => {
    if (s === "valid" || s === "present" || s === "healthy") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === "missing") return <XCircle className="w-4 h-4 text-destructive" />;
    if (s === "degraded") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-destructive" />;
  };

  return (
    <>
      <Helmet>
        <title>Voice Debug Admin — UNPRO</title>
      </Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">🎙️ Voice Reliability Debug</h1>
            <p className="text-sm text-muted-foreground">Diagnostics en temps réel du pipeline vocal Alex</p>
          </div>
          <Button onClick={fetchAll} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                État global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {health && statusIcon(health.status)}
                <span className="text-lg font-bold capitalize">{health?.status || "..."}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Sessions 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{health?.metrics_24h?.total_sessions ?? "—"}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Erreurs 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-destructive">{health?.metrics_24h?.total_errors ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-2">({health?.metrics_24h?.error_rate || "N/A"})</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Fallbacks 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-yellow-600">{health?.metrics_24h?.fallback_uses ?? "—"}</span>
            </CardContent>
          </Card>
        </div>

        {/* Provider Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              État des providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health?.checks && Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  {statusIcon(check.status)}
                  <span className="text-sm font-medium">{key.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={check.status === "valid" || check.status === "present" ? "default" : "destructive"}>
                    {check.status}
                  </Badge>
                  {check.detail && <span className="text-xs text-muted-foreground">{check.detail}</span>}
                </div>
              </div>
            ))}
            {!health?.checks && <p className="text-sm text-muted-foreground">Chargement…</p>}
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Erreurs récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune erreur récente 🎉</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {errors.map((err) => (
                  <div key={err.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{err.provider_name} → {err.module_name}</span>
                      <Badge variant="outline" className="text-xs">{err.error_code}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{err.error_message?.slice(0, 200)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>HTTP {err.http_status}</span>
                      {err.fallback_applied && <Badge variant="secondary" className="text-xs">Fallback appliqué</Badge>}
                      <span>{new Date(err.created_at).toLocaleString("fr-CA")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions vocales récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune session</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-card border border-border/30 text-sm flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={s.session_status === "completed" ? "default" : s.session_status === "failed" ? "destructive" : "secondary"}>
                          {s.session_status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{s.entry_point}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>TTS: {s.active_tts_provider || "—"}</span>
                        <span>STT: {s.active_stt_provider || "—"}</span>
                        {s.fallback_used && <Badge variant="outline" className="text-xs">Fallback</Badge>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("fr-CA")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
