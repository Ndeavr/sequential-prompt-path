/**
 * /admin/acquisition/activation — Unified Activation cockpit (Phase 5)
 * Shows recent ledger entries, stalled activations, and lets admins force-activate.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, RefreshCw, Zap, Loader2 } from "lucide-react";

interface LedgerRow {
  id: string;
  contractor_id: string;
  action: string;
  source: string;
  plan_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}
interface StalledRow {
  contractor_id: string;
  reason: string;
  detected_source: string;
  paid_at: string;
  age_minutes: number;
  plan_id: string | null;
}

export default function PageAdminAcquisitionActivation() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [stalled, setStalled] = useState<StalledRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [ledgerRes, stalledRes] = await Promise.all([
      supabase
        .from("contractor_activation_ledger")
        .select("id,contractor_id,action,source,plan_id,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.rpc("stalled_activations_report", { p_min_age_minutes: 10 }),
    ]);
    if (ledgerRes.error) toast.error(ledgerRes.error.message);
    else setLedger((ledgerRes.data ?? []) as LedgerRow[]);
    if (stalledRes.error) toast.error(stalledRes.error.message);
    else setStalled((stalledRes.data ?? []) as StalledRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function activateOne(contractorId: string, planId: string | null) {
    setBusy(contractorId);
    try {
      const { data, error } = await supabase.functions.invoke("unified-activation", {
        body: { contractor_id: contractorId, source: "admin", plan_id: planId ?? undefined },
      });
      if (error) throw error;
      const action = (data as { result?: { action?: string } })?.result?.action ?? "activated";
      toast.success(`Contractor ${action}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(null);
    }
  }

  async function reconcileAll() {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke("unified-activation", {
        body: { reconcile: true, min_age_minutes: 10 },
      });
      if (error) throw error;
      const processed = (data as { processed?: number })?.processed ?? 0;
      toast.success(`Reconciliation done — ${processed} contractors processed`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reconciliation failed");
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unified Activation</h1>
          <p className="text-sm text-muted-foreground">
            Every payment → published profile. One canonical path.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={reconcileAll} disabled={reconciling || stalled.length === 0}>
            {reconciling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Reconcile all stalled ({stalled.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Stalled activations ({stalled.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stalled.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stalled activations — every paying contractor is published.</p>
          ) : (
            <div className="space-y-2">
              {stalled.map((r) => (
                <div
                  key={`${r.contractor_id}-${r.reason}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="text-sm">
                    <div className="font-mono text-xs">{r.contractor_id}</div>
                    <div className="text-muted-foreground">
                      {r.reason} · {r.detected_source} · {r.age_minutes} min · plan {r.plan_id ?? "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy === r.contractor_id}
                    onClick={() => activateOne(r.contractor_id, r.plan_id)}
                  >
                    {busy === r.contractor_id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 mr-1" />
                    )}
                    Force activate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Recent activations (50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border p-2 text-xs">
                <div className="font-mono">{row.contractor_id}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.action === "activated" ? "default" : "secondary"}>{row.action}</Badge>
                  <Badge variant="outline">{row.source}</Badge>
                  <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {ledger.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No activations logged yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
