import { useChallengeTarget, useChallengeAgents, useChallengeFunnel, useToggleChallengeAgent, useRunChallengeAgent } from "@/hooks/useChallengeTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Clock, Mail, Target, Zap, AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";

const FUNNEL_ORDER = ["qualified", "contacted", "viewed", "nudged", "started", "converted"];

export default function PageChallengeTracker() {
  const { data: target } = useChallengeTarget();
  const { data: agents = [] } = useChallengeAgents();
  const { data: events = [] } = useChallengeFunnel(200);
  const toggleAgent = useToggleChallengeAgent();
  const runAgent = useRunChallengeAgent();

  const funnel = useMemo(() => {
    const counts: Record<string, number> = { qualified: 0, contacted: 0, viewed: 0, nudged: 0, started: 0, converted: 0 };
    for (const e of events) {
      if (e.event_type === "prospect_qualified") counts.qualified++;
      else if (e.event_type === "email_sent") counts.contacted++;
      else if (e.event_type === "aipp_viewed") counts.viewed++;
      else if (e.event_type === "nudge_sent") counts.nudged++;
      else if (e.event_type === "onboarding_started") counts.started++;
      else if (e.event_type === "signup_completed") counts.converted++;
    }
    return counts;
  }, [events]);

  const progress = target ? Math.min(100, (target.current_value / target.target_value) * 100) : 0;
  const timeLeft = target ? formatDistanceToNow(new Date(target.ends_at), { locale: fr, addSuffix: true }) : "—";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Hero target */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Target className="h-7 w-7 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-2xl">{target?.label ?? "Challenge"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Échéance {timeLeft}</p>
            </div>
            <Badge variant={target?.current_value && target.current_value >= (target?.target_value ?? 1) ? "default" : "secondary"} className="text-base px-3 py-1">
              {target?.current_value ?? 0} / {target?.target_value ?? 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Funnel temps réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {FUNNEL_ORDER.map((stage) => (
              <div key={stage} className="rounded-lg border bg-card p-4 text-center">
                <div className="text-3xl font-bold text-primary">{funnel[stage] ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{stage}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Agents autonomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.map((a) => (
            <div key={a.agent_key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Switch
                checked={a.enabled}
                onCheckedChange={(v) => toggleAgent.mutate({ agentKey: a.agent_key, enabled: v })}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{a.agent_name}</span>
                  {a.last_run_status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {a.last_run_status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  <Clock className="h-3 w-3" />
                  {a.last_run_at ? formatDistanceToNow(new Date(a.last_run_at), { locale: fr, addSuffix: true }) : "jamais"}
                  · {a.total_runs} runs · {a.total_processed} traités
                </div>
                {a.last_error && <div className="text-xs text-destructive mt-1 truncate">{a.last_error}</div>}
              </div>
              <Button size="sm" variant="outline" onClick={() => runAgent.mutate(a.agent_key)} disabled={runAgent.isPending}>
                <PlayCircle className="h-4 w-4 mr-1" /> Run
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Event log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Événements récents</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun événement — lance un agent pour démarrer.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-2 rounded border-l-2 border-primary/30 bg-muted/30 text-sm">
                  <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {e.agent_source ?? "system"} · {formatDistanceToNow(new Date(e.created_at), { locale: fr, addSuffix: true })}
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="text-xs mt-1 truncate">
                        {(e.metadata.business_name as string) ?? (e.metadata.recipient as string) ?? JSON.stringify(e.metadata).slice(0, 80)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
