/**
 * UNPRO — Admin Critical Path Audit
 * 7-stage acquisition funnel cockpit with real numbers + live end-to-end test runner.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Play, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

type Stage = {
  stage: string;
  label: string;
  order: number;
  value: number;
  previous?: number;
  conversion_rate?: number;
  top_failures: Array<{ code: string; count: number }>;
  meta?: Record<string, unknown>;
};

const STAGE_KEYS = [
  "prospect_found", "messages_sent", "link_clicked", "alex_started",
  "analysis_complete", "payment_ok", "reward_visible",
];

function stageColor(rate?: number) {
  if (rate === undefined) return "text-muted-foreground";
  if (rate >= 80) return "text-emerald-400";
  if (rate >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function PageAdminCriticalPathAudit() {
  const qc = useQueryClient();
  const [testerPhone, setTesterPhone] = useState("");
  const [testerEmail, setTesterEmail] = useState("");
  const [testerName, setTesterName] = useState("");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const snapshot = useQuery({
    queryKey: ["critical-path-snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("critical-path-snapshot", { body: {} });
      if (error) throw error;
      return data as { captured_at: string; stages: Stage[] };
    },
    refetchInterval: 60_000,
  });

  const currentRun = useQuery({
    queryKey: ["critical-path-run", currentRunId],
    queryFn: async () => {
      if (!currentRunId) return null;
      const { data, error } = await supabase.functions.invoke("critical-path-live-test", {
        body: { action: "get", run_id: currentRunId },
      });
      if (error) throw error;
      return data.run as any;
    },
    enabled: !!currentRunId,
    refetchInterval: currentRunId ? 5000 : false,
  });

  const startTest = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("critical-path-live-test", {
        body: {
          action: "start",
          tester_phone: testerPhone,
          tester_email: testerEmail,
          tester_business_name: testerName,
        },
      });
      if (error) throw error;
      return data.run;
    },
    onSuccess: (run: any) => {
      setCurrentRunId(run.id);
      toast.success("Test live démarré — SMS envoyé");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur démarrage test"),
  });

  const advance = useMutation({
    mutationFn: async ({ stage, status, error: stageError }: { stage: string; status: "ok" | "error"; error?: string }) => {
      const { data, error } = await supabase.functions.invoke("critical-path-live-test", {
        body: { action: "advance", run_id: currentRunId, stage, status, error: stageError },
      });
      if (error) throw error;
      return data.run;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["critical-path-run", currentRunId] }),
  });

  const stages = snapshot.data?.stages || [];

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Critical Path Audit</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Funnel d'acquisition 7 étapes — mesure réelle avant tout changement de messaging.
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => snapshot.refetch()}
            disabled={snapshot.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${snapshot.isFetching ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </header>

        {/* Funnel header */}
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Conversion globale {snapshot.data?.captured_at && `· ${new Date(snapshot.data.captured_at).toLocaleTimeString("fr-CA")}`}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {stages.map((s, i) => (
              <div key={s.stage} className="flex items-center gap-1 shrink-0">
                <div className="text-center px-2">
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground max-w-[80px] leading-tight">{s.label}</div>
                </div>
                {i < stages.length - 1 && (
                  <div className={`text-xs font-mono ${stageColor(stages[i + 1].conversion_rate)}`}>
                    →{stages[i + 1].conversion_rate ?? 0}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Stage cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.isLoading && (
            <div className="col-span-full text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des métriques…
            </div>
          )}
          {stages.map((s) => {
            const rate = s.conversion_rate;
            const alert = rate !== undefined && rate < 50;
            return (
              <Card key={s.stage} className={`p-4 ${alert ? "border-red-500/50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    <div className="text-3xl font-semibold mt-1">{s.value}</div>
                  </div>
                  {rate !== undefined && (
                    <div className={`text-right ${stageColor(rate)}`}>
                      <div className="text-2xl font-mono">{rate}%</div>
                      <div className="text-[10px] text-muted-foreground">vs étape précédente</div>
                    </div>
                  )}
                  {alert && <AlertTriangle className="h-5 w-5 text-red-400" />}
                </div>
                {s.meta && (
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    {Object.entries(s.meta).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}</span><span className="text-foreground/80 font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.top_failures.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Top échecs</div>
                    {s.top_failures.map((f) => (
                      <div key={f.code} className="text-xs flex justify-between">
                        <span className="text-red-400">{f.code}</span>
                        <span className="font-mono">{f.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Live test runner */}
        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Test live prospect réel</h2>
            <p className="text-xs text-muted-foreground">
              Un vrai SMS sera envoyé au numéro fourni. Suivez chaque étape et validez manuellement.
            </p>
          </div>

          {!currentRunId && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Téléphone (+1...)" value={testerPhone} onChange={(e) => setTesterPhone(e.target.value)} />
              <Input placeholder="Email" value={testerEmail} onChange={(e) => setTesterEmail(e.target.value)} />
              <Input placeholder="Nom entreprise" value={testerName} onChange={(e) => setTesterName(e.target.value)} />
              <Button
                className="md:col-span-3"
                onClick={() => startTest.mutate()}
                disabled={!testerPhone || !testerEmail || startTest.isPending}
              >
                {startTest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Lancer le test live
              </Button>
            </div>
          )}

          {currentRunId && currentRun.data && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  Run <span className="font-mono text-xs">{currentRunId.slice(0, 8)}</span> ·
                  status <span className="font-semibold">{currentRun.data.final_status}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentRunId(null)}>Fermer</Button>
              </div>
              <div className="space-y-1.5">
                {STAGE_KEYS.map((key, idx) => {
                  const ts = currentRun.data.stage_timestamps?.[key];
                  const st = currentRun.data.stage_status?.[key];
                  const done = !!ts;
                  return (
                    <div key={key} className="flex items-center gap-3 p-2 rounded border border-border">
                      <div className="w-6 text-center">
                        {st === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        {st === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                        {!done && <div className="text-xs text-muted-foreground">{idx + 1}</div>}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{key}</div>
                        {ts && <div className="text-[10px] text-muted-foreground">{new Date(ts).toLocaleTimeString("fr-CA")}</div>}
                      </div>
                      {!done && idx > 1 && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => advance.mutate({ stage: key, status: "ok" })}>OK</Button>
                          <Button size="sm" variant="outline" onClick={() => advance.mutate({ stage: key, status: "error", error: "manual fail" })}>Fail</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {currentRun.data.errors?.length > 0 && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
                  <div className="font-semibold text-red-400 mb-1">Erreurs</div>
                  <pre className="overflow-auto text-[10px]">{JSON.stringify(currentRun.data.errors, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
