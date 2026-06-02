import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, Loader2, PlayCircle, RefreshCw, ShieldAlert, Zap } from "lucide-react";

type Check = {
  module: string;
  target: string;
  status: "green" | "yellow" | "red";
  latency_ms: number;
  quota_remaining?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  probable_cause?: string | null;
  proposed_fix?: string | null;
  auto_fixable?: boolean;
  metadata?: Record<string, unknown>;
};

type Policy = {
  id: string;
  system: string;
  action: string;
  severity: "safe" | "warning" | "critical";
  auto_allowed: boolean;
  requires_confirmation: boolean;
  cooldown_seconds: number;
  max_retries: number;
  enabled: boolean;
  description: string | null;
};

type FixLog = {
  id: string;
  policy_id: string | null;
  action_taken: string | null;
  classification: string | null;
  success: boolean;
  automatic: boolean;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
};

type RecoveryMode = "observe" | "safe" | "aggressive";

const STATUS_DOT: Record<Check["status"], string> = {
  green: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
  yellow: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
  red: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]",
};

const SEVERITY_BADGE: Record<Policy["severity"], string> = {
  safe: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function fmtMs(ms: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function PageFounderVerification() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>("observe");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [logs, setLogs] = useState<FixLog[]>([]);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);

  // Live test inputs
  const [testCity, setTestCity] = useState("Laval");
  const [testTrade, setTestTrade] = useState("isolation");
  const [testWebsite, setTestWebsite] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testOutput, setTestOutput] = useState<Record<string, any>>({});
  const [runningKind, setRunningKind] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("founder-health-snapshot", { body: {} });
      if (error) throw error;
      setChecks((data?.checks as Check[]) ?? []);
      setLastSnapshotAt(data?.taken_at ?? new Date().toISOString());
    } catch (e: any) {
      toast.error(`Snapshot failed: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPolicies = async () => {
    const { data } = await supabase.from("auto_fix_policies").select("*").order("severity").order("system");
    setPolicies((data as Policy[]) ?? []);
  };
  const loadLogs = async () => {
    const { data } = await supabase.from("auto_fix_logs").select("*").order("created_at", { ascending: false }).limit(25);
    setLogs((data as FixLog[]) ?? []);
  };

  useEffect(() => {
    refresh();
    loadPolicies();
    loadLogs();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, []);

  const runLiveTest = async (kind: string, input: any) => {
    setRunningKind(kind);
    try {
      const { data, error } = await supabase.functions.invoke("founder-run-live-test", { body: { kind, input } });
      if (error) throw error;
      setTestOutput((p) => ({ ...p, [kind]: data }));
      toast.success(`Test ${kind}: ${data?.verdict ?? "ok"} (${fmtMs(data?.latency_ms ?? 0)})`);
    } catch (e: any) {
      toast.error(`Test ${kind} failed: ${e.message ?? e}`);
      setTestOutput((p) => ({ ...p, [kind]: { error: String(e.message ?? e) } }));
    } finally {
      setRunningKind(null);
    }
  };

  const runStripeFlow = async () => {
    setRunningKind("stripe-flow");
    try {
      const { data, error } = await supabase.functions.invoke("founder-stripe-test-flow", { body: {} });
      if (error) throw error;
      setTestOutput((p) => ({ ...p, stripeFlow: data }));
      toast.success(data?.ok ? "Stripe flow OK" : "Stripe flow degraded");
    } catch (e: any) {
      toast.error(`Stripe flow: ${e.message ?? e}`);
    } finally {
      setRunningKind(null);
    }
  };

  const executePolicy = async (p: Policy) => {
    if (recoveryMode === "observe") {
      if (!window.confirm(`Mode Observe Only.\n\nExécuter "${p.action}" (${p.severity}) ?`)) return;
    } else if (p.severity !== "safe" || recoveryMode !== "aggressive") {
      if (!window.confirm(`Confirmer fix ${p.severity.toUpperCase()}: ${p.action} ?`)) return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("founder-execute-fix", {
        body: { policy_id: p.id, target: p.system, automatic: false, confirm: true },
      });
      if (error) throw error;
      toast.success(data?.success ? `Fix ${p.action} OK` : `Fix ${p.action} échoué`);
      loadLogs();
    } catch (e: any) {
      toast.error(`Fix: ${e.message ?? e}`);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, Check[]> = {};
    for (const c of checks) (g[c.module] ??= []).push(c);
    return g;
  }, [checks]);

  const summary = useMemo(() => {
    const red = checks.filter((c) => c.status === "red").length;
    const yellow = checks.filter((c) => c.status === "yellow").length;
    const green = checks.filter((c) => c.status === "green").length;
    return { red, yellow, green, total: checks.length };
  }, [checks]);

  return (
    <div className="min-h-screen bg-[#050816] text-foreground">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 h-[60vh] w-[60vw] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 h-[60vh] w-[60vw] bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_70%)]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white">
              Founder Verification Command Center
            </h1>
            <p className="text-sm text-white/60 mt-1">Visibility before scale · {lastSnapshotAt ? `mis à jour ${new Date(lastSnapshotAt).toLocaleTimeString("fr-CA")}` : "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={recoveryMode} onValueChange={(v) => setRecoveryMode(v as RecoveryMode)}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observe">Observe Only</SelectItem>
                <SelectItem value="safe">Safe Recovery</SelectItem>
                <SelectItem value="aggressive" disabled>Aggressive (locked)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={refresh} disabled={loading} className="bg-primary/90 hover:bg-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Modules", value: summary.total, icon: Activity, color: "text-white/80" },
            { label: "Healthy", value: summary.green, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Degraded", value: summary.yellow, icon: AlertTriangle, color: "text-amber-400" },
            { label: "Failing", value: summary.red, icon: ShieldAlert, color: "text-rose-400" },
          ].map((k) => (
            <Card key={k.label} className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/50">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className={`text-3xl font-semibold mt-2 ${k.color}`}>{k.value}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="health" className="w-full">
          <TabsList className="bg-white/5 border border-white/5">
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="tests">Live Tests</TabsTrigger>
            <TabsTrigger value="fixes">Auto-Fix Policies</TabsTrigger>
            <TabsTrigger value="logs">Recovery Logs</TabsTrigger>
          </TabsList>

          {/* HEALTH */}
          <TabsContent value="health" className="space-y-4 mt-4">
            {Object.entries(grouped).map(([module, items]) => (
              <Card key={module} className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm uppercase tracking-wider text-white/70">{module}</h3>
                  <Badge variant="outline" className="border-white/10 text-white/60">{items.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((c, i) => (
                    <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[c.status]} animate-pulse`} />
                          <div className="min-w-0">
                            <div className="text-sm text-white font-medium truncate">{c.target}</div>
                            <div className="text-xs text-white/50">{fmtMs(c.latency_ms)}{c.quota_remaining ? ` · ${c.quota_remaining}` : ""}</div>
                          </div>
                        </div>
                        {c.error_code && (
                          <Badge variant="outline" className="border-rose-500/30 text-rose-300 text-[10px]">{c.error_code}</Badge>
                        )}
                      </div>
                      {c.probable_cause && (
                        <div className="mt-3 text-xs text-white/60">
                          <div className="text-white/40 uppercase tracking-wider text-[10px]">Cause probable</div>
                          {c.probable_cause}
                        </div>
                      )}
                      {c.proposed_fix && (
                        <div className="mt-2 text-xs text-amber-300/80">
                          <div className="text-white/40 uppercase tracking-wider text-[10px]">Fix proposé</div>
                          {c.proposed_fix}
                        </div>
                      )}
                      {c.error_message && (
                        <div className="mt-2 text-[11px] text-rose-300/80 line-clamp-2">{c.error_message}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {!checks.length && !loading && (
              <Card className="bg-white/[0.03] border-white/5 p-10 text-center text-white/50">
                Aucune donnée. Lance un Refresh.
              </Card>
            )}
          </TabsContent>

          {/* LIVE TESTS */}
          <TabsContent value="tests" className="space-y-4 mt-4">
            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70">Scraping (Google Places)</h3>
              <div className="flex flex-wrap gap-2">
                <Input value={testCity} onChange={(e) => setTestCity(e.target.value)} placeholder="Ville" className="bg-white/5 border-white/10 max-w-[180px]" />
                <Input value={testTrade} onChange={(e) => setTestTrade(e.target.value)} placeholder="Trade" className="bg-white/5 border-white/10 max-w-[180px]" />
                <Button onClick={() => runLiveTest("scrape", { city: testCity, trade: testTrade })} disabled={runningKind === "scrape"}>
                  {runningKind === "scrape" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  <span className="ml-2">Run scrape</span>
                </Button>
              </div>
              {testOutput.scrape && <pre className="text-[11px] bg-black/30 rounded-xl p-3 overflow-auto max-h-48 text-white/70">{JSON.stringify(testOutput.scrape, null, 2)}</pre>}
            </Card>

            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70">AIPP Engine</h3>
              <div className="flex flex-wrap gap-2">
                <Input value={testWebsite} onChange={(e) => setTestWebsite(e.target.value)} placeholder="https://entreprise.ca" className="bg-white/5 border-white/10 max-w-[300px]" />
                <Button onClick={() => runLiveTest("aipp", { website: testWebsite })} disabled={runningKind === "aipp" || !testWebsite}>
                  {runningKind === "aipp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  <span className="ml-2">Run AIPP</span>
                </Button>
              </div>
              {testOutput.aipp && <pre className="text-[11px] bg-black/30 rounded-xl p-3 overflow-auto max-h-48 text-white/70">{JSON.stringify(testOutput.aipp, null, 2)}</pre>}
            </Card>

            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70">SMS (Twilio dry-run)</h3>
              <div className="flex flex-wrap gap-2">
                <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+15145551234" className="bg-white/5 border-white/10 max-w-[220px]" />
                <Button onClick={() => runLiveTest("sms", { to: testPhone })} disabled={runningKind === "sms" || !testPhone}>
                  {runningKind === "sms" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  <span className="ml-2">Test SMS</span>
                </Button>
              </div>
              {testOutput.sms && <pre className="text-[11px] bg-black/30 rounded-xl p-3 overflow-auto max-h-48 text-white/70">{JSON.stringify(testOutput.sms, null, 2)}</pre>}
            </Card>

            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70">Email Deliverability</h3>
              <div className="flex flex-wrap gap-2">
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="vous@exemple.com" className="bg-white/5 border-white/10 max-w-[260px]" />
                <Button onClick={() => runLiveTest("email", { recipient: testEmail })} disabled={runningKind === "email"}>
                  {runningKind === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  <span className="ml-2">Test email</span>
                </Button>
              </div>
              {testOutput.email && <pre className="text-[11px] bg-black/30 rounded-xl p-3 overflow-auto max-h-48 text-white/70">{JSON.stringify(testOutput.email, null, 2)}</pre>}
            </Card>

            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70">Stripe E2E Flow</h3>
              <Button onClick={runStripeFlow} disabled={runningKind === "stripe-flow"}>
                {runningKind === "stripe-flow" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-2">Run Stripe verification flow</span>
              </Button>
              {testOutput.stripeFlow && (
                <div className="space-y-2">
                  {(testOutput.stripeFlow.stages ?? []).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs border border-white/5 bg-white/[0.02] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-emerald-400" : "bg-rose-500"}`} />
                        <span className="text-white/80">{s.stage}</span>
                      </div>
                      <span className="text-white/50">{fmtMs(s.ms)} · {s.detail ?? ""}</span>
                    </div>
                  ))}
                  {testOutput.stripeFlow.checkout_url && (
                    <a href={testOutput.stripeFlow.checkout_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Ouvrir la session checkout test</a>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* POLICIES */}
          <TabsContent value="fixes" className="mt-4">
            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/50 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-2">System</th>
                      <th className="text-left">Action</th>
                      <th className="text-left">Severity</th>
                      <th className="text-left">Auto</th>
                      <th className="text-left">Cooldown</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p.id} className="border-t border-white/5">
                        <td className="py-3 text-white/80">{p.system}</td>
                        <td className="text-white/70">{p.action}</td>
                        <td><Badge className={SEVERITY_BADGE[p.severity]}>{p.severity.toUpperCase()}</Badge></td>
                        <td className="text-white/60">{p.auto_allowed ? "yes" : "no"}</td>
                        <td className="text-white/60">{p.cooldown_seconds}s</td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => executePolicy(p)} disabled={!p.enabled}>
                            Execute Fix
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* LOGS */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-white/[0.03] border-white/5 backdrop-blur-xl p-5">
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs border border-white/5 bg-white/[0.02] rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full ${l.success ? "bg-emerald-400" : "bg-rose-500"}`} />
                      <span className="text-white/80 truncate">{l.action_taken}</span>
                      {l.classification && <Badge variant="outline" className="text-[10px] border-white/10">{l.classification}</Badge>}
                    </div>
                    <div className="text-white/40 shrink-0">
                      {fmtMs(l.execution_time_ms ?? 0)} · {new Date(l.created_at).toLocaleString("fr-CA")}
                    </div>
                  </div>
                ))}
                {!logs.length && <div className="text-center text-white/40 py-8 text-sm">Aucun fix exécuté</div>}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
