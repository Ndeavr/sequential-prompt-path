/**
 * PageAdminLiveRuns — Cockpit for end-to-end acquisition runs.
 * URL: /admin/live-runs
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Run = {
  id: string;
  prospect_id: string;
  campaign: string;
  status: string;
  metadata: any;
  created_at: string;
};

type Step = {
  id: string;
  run_id: string;
  step_key: string;
  step_order: number;
  status: string;
  logs: any[];
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/20 text-blue-300",
  succeeded: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  blocked: "bg-amber-500/20 text-amber-300",
};

async function invokeWithTimeout<T = any>(
  name: string,
  body: any,
  timeoutMs = 30000,
): Promise<{ data: T | null; error: any }> {
  return await Promise.race([
    supabase.functions.invoke(name, { body }) as Promise<any>,
    new Promise<any>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error(`Timeout ${timeoutMs}ms invoking ${name}`) }), timeoutMs),
    ),
  ]);
}

export default function PageAdminLiveRuns() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [adminPhone, setAdminPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<{ email?: string; isAdmin?: boolean; error?: string }>({});
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await invokeWithTimeout<any>("list-live-runs", {}, 15000);
    if (error || !data) {
      setAuthState({ error: error?.message || "list-live-runs failed" });
      return;
    }
    if (data.error) {
      setAuthState({ email: data.email, isAdmin: false, error: data.message || data.error });
      return;
    }
    setAuthState({ email: data.admin_email, isAdmin: true });
    setRuns(data.runs || []);
    const grouped: Record<string, Step[]> = {};
    (data.steps || []).forEach((row: any) => {
      (grouped[row.run_id] ||= []).push(row);
    });
    setSteps(grouped);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("live_runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_acquisition_runs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "acquisition_run_steps" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const startIsrRun = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const { data, error } = await invokeWithTimeout<any>(
        "run-live-acquisition",
        { slug: "isolation-solution-royal", campaign: "isr_first_live_test" },
        30000,
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const runId = data?.run_id;
      const existed = (runs || []).some((r) => r.id === runId);
      toast.success(existed ? `Run resumed — ${runId?.slice(0, 8)}…` : `Run created — ${runId?.slice(0, 8)}…`);
      console.groupCollapsed(`[live-run] ${runId}`);
      console.log(data);
      console.groupEnd();
      await refresh();
    } catch (e: any) {
      const msg = e?.message || String(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const dryRun = async (run: Run) => {
    if (!adminPhone) return toast.error("Enter your admin phone (+1...)");
    try {
      const { data, error } = await invokeWithTimeout<any>(
        "approve-isr-sms",
        { run_id: run.id, dry_run: true, admin_phone: adminPhone },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Dry-run sent to ${data.sent_to}${data.simulated ? " (simulated)" : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Dry-run failed");
    }
  };

  const approveSend = async (run: Run) => {
    const target = run.metadata?.sms_to;
    if (!confirmPhone || confirmPhone !== target) {
      return toast.error(`Type the prospect phone exactly: ${target}`);
    }
    if (!confirm(`Send REAL SMS to ${target}?`)) return;
    try {
      const { data, error } = await invokeWithTimeout<any>(
        "approve-isr-sms",
        { run_id: run.id, dry_run: false, confirm_phone: confirmPhone },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`SMS sent — sid ${data.sid || "(simulated)"}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    }
  };

  const startCheckout = async (run: Run) => {
    try {
      const { data, error } = await invokeWithTimeout<any>(
        "create-isr-promo-checkout",
        { slug: run.metadata?.slug, run_id: run.id },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white p-6">
      <Helmet><title>Live Acquisition Runs — Admin UNPRO</title></Helmet>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">Live Acquisition Runs</h1>
            <p className="text-white/60 text-sm mt-1">End-to-end pipeline cockpit · ISR live test</p>
            <p className="text-xs text-white/40 mt-1">
              {authState.email ? (
                <>Signed in as <span className="text-white/70">{authState.email}</span> · {authState.isAdmin ? <span className="text-emerald-400">admin</span> : <span className="text-red-400">not admin</span>}</>
              ) : authState.error ? (
                <span className="text-red-400">{authState.error}</span>
              ) : (
                "Checking auth…"
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>Refresh</Button>
            <Button onClick={startIsrRun} disabled={loading || !authState.isAdmin}>
              {loading ? "Starting…" : "Start ISR Live Run"}
            </Button>
          </div>
        </header>

        {!authState.isAdmin && authState.email && (
          <Card className="bg-red-500/10 border-red-500/30 p-4 text-sm text-red-200">
            Admin role required. Your account <strong>{authState.email}</strong> doesn't have the <code>admin</code> role.
          </Card>
        )}

        {lastError && (
          <Card className="bg-red-500/10 border-red-500/30 p-4 text-sm text-red-200 flex items-start justify-between gap-3">
            <pre className="whitespace-pre-wrap break-words flex-1">{lastError}</pre>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(lastError)}>Copy</Button>
          </Card>
        )}

        <Card className="bg-white/[0.04] border-white/10 p-4 space-y-3">
          <h2 className="font-semibold">SMS Approval Controls</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60">Your admin phone (dry-run target)</label>
              <Input
                placeholder="+15145551234"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-white/60">Prospect phone (type to confirm real send)</label>
              <Input
                placeholder="+15142499522"
                value={confirmPhone}
                onChange={(e) => setConfirmPhone(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {runs.length === 0 && (
            <Card className="bg-white/[0.04] border-white/10 p-8 text-center text-white/60">
              No runs yet. Click "Start ISR Live Run" above.
            </Card>
          )}
          {runs.map((run) => {
            const open = openRunId === run.id;
            const rs = steps[run.id] || [];
            return (
              <Card key={run.id} className="bg-white/[0.04] border-white/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{run.metadata?.slug || "(no slug)"}</h3>
                      <Badge className={STATUS_COLORS[run.status] || ""}>{run.status}</Badge>
                      <span className="text-xs text-white/40">{run.campaign}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1 truncate">
                      {run.metadata?.landing_url} · phone {run.metadata?.sms_to}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setOpenRunId(open ? null : run.id)}>
                      {open ? "Hide" : "Steps"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dryRun(run)}>
                      Dry-run SMS
                    </Button>
                    <Button size="sm" onClick={() => approveSend(run)}>
                      Approve &amp; Send
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => startCheckout(run)}>
                      Open $1 Checkout
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 space-y-2">
                    {rs.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 text-sm">
                        <span className="w-6 text-white/40 text-right">{s.step_order + 1}.</span>
                        <span className="w-40 font-mono">{s.step_key}</span>
                        <Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge>
                        <span className="text-xs text-white/40">
                          {s.completed_at ? new Date(s.completed_at).toLocaleTimeString() : "—"}
                        </span>
                        {s.logs?.length > 0 && (
                          <details className="text-xs text-white/50 ml-auto">
                            <summary className="cursor-pointer">logs</summary>
                            <pre className="mt-1 max-w-md whitespace-pre-wrap break-words">
                              {JSON.stringify(s.logs[s.logs.length - 1], null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                    {run.metadata?.sms_body && (
                      <div className="mt-3 p-3 rounded bg-black/30 border border-white/10">
                        <div className="text-xs text-white/50 mb-1">SMS preview (to {run.metadata.sms_to})</div>
                        <pre className="text-xs whitespace-pre-wrap">{run.metadata.sms_body}</pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
