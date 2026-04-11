/**
 * PageAlexConversationDebugAdmin — Debug view for Alex conversations.
 * Shows resolved prompt, detected intents, assessments, violations, decisions.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, Brain, Shield, Calendar } from "lucide-react";

export default function PageAlexConversationDebugAdmin() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [sessRes, violRes] = await Promise.all([
      supabase
        .from("alex_conversation_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("alex_policy_violations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setSessions((sessRes.data as any[]) || []);
    setViolations((violRes.data as any[]) || []);
    setLoading(false);
  }

  async function loadSessionDetails(sessionId: string) {
    setSelectedSession(sessionId);
    const [assessRes, recoRes] = await Promise.all([
      supabase
        .from("alex_problem_assessments")
        .select("*")
        .eq("conversation_session_id", sessionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("alex_recommendation_decisions")
        .select("*")
        .eq("conversation_session_id", sessionId)
        .order("created_at", { ascending: false }),
    ]);
    setAssessments((assessRes.data as any[]) || []);
    setRecommendations((recoRes.data as any[]) || []);
  }

  const violationColor = (type: string) => {
    switch (type) {
      case "three_quotes": return "bg-red-500";
      case "english_overuse": return "bg-orange-500";
      case "callback_without_contact": return "bg-amber-500";
      default: return "bg-muted";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "booked": return "text-green-600";
      case "active": return "text-blue-600";
      case "failed": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Debug Conversationnel Alex</h1>
          <p className="text-sm text-muted-foreground">
            Sessions, violations, évaluations et décisions en temps réel.
          </p>
        </div>
        <Button onClick={loadData} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
        </Button>
      </div>

      {/* Violations Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            Violations récentes ({violations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune violation détectée.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {violations.slice(0, 10).map((v: any) => (
                <div key={v.id} className="flex items-start gap-2 text-xs">
                  <Badge className={`${violationColor(v.violation_type)} text-white text-[9px] px-1.5`}>
                    {v.violation_type}
                  </Badge>
                  <span className="text-muted-foreground flex-1 truncate">{v.detected_text}</span>
                  <span className="text-muted-foreground/60">
                    {new Date(v.created_at).toLocaleString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessions.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => loadSessionDetails(s.id)}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                    selectedSession === s.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${statusColor(s.session_status)}`}>
                      {s.session_status}
                    </span>
                    <span className="text-muted-foreground/60">
                      {new Date(s.created_at).toLocaleString("fr-CA")}
                    </span>
                  </div>
                  {s.current_intent && (
                    <p className="text-muted-foreground mt-1">Intent: {s.current_intent}</p>
                  )}
                  {s.current_problem_summary && (
                    <p className="text-muted-foreground mt-0.5 truncate">{s.current_problem_summary}</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Détails de session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSession ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Sélectionnez une session pour voir les détails.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Assessments */}
                <div>
                  <h5 className="text-xs font-semibold text-foreground mb-2">Évaluations</h5>
                  {assessments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune.</p>
                  ) : (
                    assessments.map((a: any) => (
                      <div key={a.id} className="p-2 rounded border border-border/50 mb-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">{a.symptom_label}</span>
                          <Badge variant="outline" className="text-[9px]">{a.urgency_level}</Badge>
                        </div>
                        <p className="text-muted-foreground">{a.probable_problem}</p>
                        <p className="text-muted-foreground">Métier: {a.recommended_trade}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Recommendations */}
                <div>
                  <h5 className="text-xs font-semibold text-foreground mb-2">Recommandations</h5>
                  {recommendations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune.</p>
                  ) : (
                    recommendations.map((r: any) => (
                      <div key={r.id} className="p-2 rounded border border-border/50 mb-1 text-xs">
                        <div className="flex items-center gap-2">
                          {r.is_primary_match ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="font-medium">
                            {r.is_primary_match ? "Match principal" : "Alternative"}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1">{r.reason_summary}</p>
                        <div className="flex gap-3 mt-1 text-muted-foreground/70">
                          <span>Compat: {r.compatibility_score?.toFixed(0)}%</span>
                          <span>Dispo: {r.availability_score?.toFixed(0)}%</span>
                          <span>Confiance: {r.trust_score?.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
