/**
 * UNPRO — Growth Engine LIVE MONITOR
 * /admin/growth-live-monitor
 *
 * Truth rule:
 *   sms_sent_today + email_sent_today === 0  =>  BLOCKED banner (never SUCCESS).
 */
import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Stethoscope } from "lucide-react";
import { toast } from "sonner";

type Today = {
  sms_sent_today: number;
  email_sent_today: number;
  waiting_approval_today: number;
  failed_today: number;
  blocked_today: number;
  replies_today: number;
  bookings_today: number;
  activations_today: number;
  contractors_contacted_today: number;
  is_production_live: boolean;
};

type AgentLog = {
  id: string;
  agent_name: string;
  status: string;
  input_count: number;
  processed_count: number;
  generated_count: number;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type Msg = {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type Check = {
  component: string;
  status: "WORKING" | "BLOCKED" | "PARTIAL";
  root_cause?: string | null;
  affected?: string | null;
  fix?: string | null;
  detail?: unknown;
};

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    WORKING: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    BLOCKED: "bg-destructive/15 text-destructive border-destructive/30",
    PARTIAL: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    success: "bg-emerald-500/15 text-emerald-700",
    partial: "bg-amber-500/15 text-amber-700",
    blocked: "bg-destructive/15 text-destructive",
    failed: "bg-destructive/15 text-destructive",
    running: "bg-blue-500/15 text-blue-700",
    idle: "bg-muted text-muted-foreground",
    sent: "bg-emerald-500/15 text-emerald-700",
    delivered: "bg-emerald-600/20 text-emerald-700",
    waiting_approval: "bg-amber-500/15 text-amber-700",
    sending: "bg-blue-500/15 text-blue-700",
    replied: "bg-violet-500/15 text-violet-700",
    booked: "bg-fuchsia-500/15 text-fuchsia-700",
    activated: "bg-emerald-600/25 text-emerald-700",
  };
  return map[s] ?? "bg-muted text-foreground";
};

const AdminGrowthLiveMonitor = () => {
  const [today, setToday] = useState<Today | null>(null);
  const [running, setRunning] = useState<AgentLog[]>([]);
  const [lastRuns, setLastRuns] = useState<AgentLog[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [checkOverall, setCheckOverall] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [tRes, runRes, lastRes, msgRes] = await Promise.all([
      supabase.from("v_growth_engine_today").select("*").maybeSingle(),
      supabase
        .from("growth_agent_logs")
        .select("*")
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("growth_agent_logs")
        .select("*")
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("growth_outbound_messages")
        .select("id, channel, recipient, status, provider_message_id, error_message, sent_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setToday((tRes.data as Today | null) ?? null);
    setRunning((runRes.data as AgentLog[]) ?? []);
    setLastRuns((lastRes.data as AgentLog[]) ?? []);
    setMessages((msgRes.data as Msg[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const runHealthCheck = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("growth-health-check", { body: {} });
      if (error) throw error;
      setChecks((data?.checks as Check[]) ?? []);
      setCheckOverall((data?.overall as string) ?? null);
      toast.success(`Health check: ${data?.overall ?? "?"}`);
    } catch (e) {
      toast.error(`Health check failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const retryDispatcher = async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("growth-task-dispatcher", { body: {} });
      await supabase.functions.invoke("growth-outreach-agent", { body: {} });
      toast.success("Dispatcher + outreach déclenchés");
      load();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const isLive = !!today?.is_production_live;

  return (
    <AdminLayout>
      <div className="admin-theme space-y-6">
        <PageHeader
          title="Growth Engine — Live Monitor"
          description="Vérité opérationnelle des agents Growth. Rien n'est marqué SUCCÈS sans envoi réel."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
              </Button>
              <Button size="sm" onClick={retryDispatcher} disabled={busy}>
                <Activity className="h-4 w-4 mr-2" /> Forcer dispatch + outreach
              </Button>
            </div>
          }
        />

        {/* TRUTH BANNER */}
        {today && (
          <Alert className={isLive ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"}>
            {isLive ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
            <AlertTitle className="text-lg font-semibold">
              {isLive
                ? `PRODUCTION LIVE — ${today.sms_sent_today + today.email_sent_today} message(s) envoyé(s) aujourd'hui`
                : "BLOCKED — 0 SMS et 0 email envoyés aujourd'hui"}
            </AlertTitle>
            <AlertDescription>
              {isLive
                ? `${today.contractors_contacted_today} entrepreneur(s) contacté(s). Le système est en production.`
                : "Le système n'est PAS en production. Il est en simulation, en attente d'approbation, ou bloqué entre génération et envoi. Lancer le health check ci-dessous."}
            </AlertDescription>
          </Alert>
        )}

        {/* COUNTERS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {today &&
            (
              [
                ["SMS envoyés", today.sms_sent_today],
                ["Emails envoyés", today.email_sent_today],
                ["Entrepreneurs contactés", today.contractors_contacted_today],
                ["En attente approbation", today.waiting_approval_today],
                ["Échecs", today.failed_today],
                ["Bloqués", today.blocked_today],
                ["Réponses", today.replies_today],
                ["RDV créés", today.bookings_today],
                ["Activations", today.activations_today],
              ] as Array<[string, number]>
            ).map(([label, v]) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <div className="text-2xl font-semibold">{v}</div>
                  <div className="text-xs text-readable-secondary">{label}</div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* HEALTH CHECK */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" /> Growth Engine Health Check
              {checkOverall && (
                <Badge className={statusColor(checkOverall)}>{checkOverall}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={runHealthCheck} disabled={busy}>
              {busy ? "Vérification…" : "Run Health Check"}
            </Button>
          </CardHeader>
          <CardContent>
            {!checks && <div className="text-sm text-readable-secondary">Cliquer "Run Health Check" pour tester credentials, edge functions, cron, et présence de données.</div>}
            {checks && (
              <div className="space-y-2">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 border border-border/40 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor(c.status)}>{c.status}</Badge>
                        <span className="font-medium">{c.component}</span>
                      </div>
                      {c.root_cause && (
                        <div className="text-sm text-readable-secondary mt-1">
                          <AlertTriangle className="h-3 w-3 inline mr-1" /> {c.root_cause}
                        </div>
                      )}
                      {c.affected && <div className="text-xs text-readable-muted mt-1">Affecté: {c.affected}</div>}
                      {c.fix && <div className="text-xs text-emerald-700 mt-1">Fix: {c.fix}</div>}
                    </div>
                    {c.status !== "WORKING" && (
                      <Button size="sm" variant="outline" onClick={runHealthCheck} disabled={busy}>
                        Retry
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AGENTS RUNNING NOW */}
        <Card>
          <CardHeader>
            <CardTitle>Agents en cours ({running.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {running.length === 0 ? (
              <div className="text-sm text-readable-secondary">Aucun agent en cours.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Démarré</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Envoyés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {running.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.agent_name}</TableCell>
                      <TableCell className="text-xs">{new Date(r.started_at).toLocaleTimeString("fr-CA")}</TableCell>
                      <TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">{r.sent_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* LAST RUNS */}
        <Card>
          <CardHeader>
            <CardTitle>Dernières exécutions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Gén.</TableHead>
                  <TableHead className="text-right">Envoyés</TableHead>
                  <TableHead className="text-right">Échecs</TableHead>
                  <TableHead>Quand</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastRuns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.agent_name}</TableCell>
                    <TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">{r.input_count}</TableCell>
                    <TableCell className="text-right">{r.generated_count}</TableCell>
                    <TableCell className="text-right font-semibold">{r.sent_count}</TableCell>
                    <TableCell className="text-right">{r.failed_count}</TableCell>
                    <TableCell className="text-xs">{new Date(r.started_at).toLocaleString("fr-CA")}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[260px] truncate">{r.error_message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* RECENT MESSAGES */}
        <Card>
          <CardHeader>
            <CardTitle>Messages sortants récents (50 derniers)</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-sm text-readable-secondary">Aucun message n'a encore été créé. Si la valeur reste à 0, le pipeline est bloqué entre génération et envoi.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Envoyé</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="uppercase text-xs">{m.channel}</TableCell>
                      <TableCell className="font-mono text-xs">{m.recipient}</TableCell>
                      <TableCell><Badge className={statusColor(m.status)}>{m.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{m.provider_message_id ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.sent_at ? new Date(m.sent_at).toLocaleString("fr-CA") : "—"}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[280px] truncate">{m.error_message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminGrowthLiveMonitor;
