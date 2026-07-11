import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type HealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "BLOCKED_BY_UNPRO_STRIPE_SECRET"
  | "ISR_DEPENDENCY_DETECTED";

interface WebhookRow {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processing_status: string;
  livemode: boolean;
  received_at: string;
  processed_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

const EXPECTED_URL =
  "https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/stripe-unpro-webhook";

export default function PageAdminUnproStripeHealth() {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileReport, setReconcileReport] = useState<unknown>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("unpro_stripe_webhook_events")
      .select("id,stripe_event_id,event_type,processing_status,livemode,received_at,processed_at,error_code,error_message")
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setRows((data as WebhookRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.processing_status] = (c[r.processing_status] ?? 0) + 1;
    return c;
  }, [rows]);

  const legacyHits = rows.filter(
    (r) => r.error_code === "unpro_event_hit_legacy_endpoint",
  ).length;

  const status: HealthStatus = useMemo(() => {
    if (legacyHits > 0) return "ISR_DEPENDENCY_DETECTED";
    if ((counts["failed"] ?? 0) > 0 || (counts["dead_letter"] ?? 0) > 0) return "CRITICAL";
    if ((counts["retry_pending"] ?? 0) > 0) return "DEGRADED";
    if (rows.length === 0) return "DEGRADED";
    return "HEALTHY";
  }, [counts, legacyHits, rows.length]);

  const statusTone: Record<HealthStatus, string> = {
    HEALTHY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    DEGRADED: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
    BLOCKED_BY_UNPRO_STRIPE_SECRET: "bg-red-500/20 text-red-300 border-red-500/40",
    ISR_DEPENDENCY_DETECTED: "bg-red-500/20 text-red-300 border-red-500/40",
  };

  async function runReconcile(dry_run: boolean) {
    setReconcileBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-unpro-reconcile",
        { body: { dry_run } },
      );
      if (error) throw error;
      setReconcileReport(data);
      toast.success(dry_run ? "Dry-run complete" : "Reconciliation applied");
    } catch (e: any) {
      toast.error(e?.message || "Reconciliation failed");
    } finally {
      setReconcileBusy(false);
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-background text-readable p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UNPRO Stripe Revenue Health</h1>
          <p className="text-readable-muted mt-1">Canonical webhook + reconciliation cockpit</p>
        </div>
        <Badge className={`text-sm px-3 py-1 border ${statusTone[status]}`}>{status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-readable-muted">Expected URL</CardTitle></CardHeader>
          <CardContent className="text-xs break-all">{EXPECTED_URL}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-readable-muted">Processed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{counts["processed"] ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-readable-muted">Retry pending</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{counts["retry_pending"] ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-readable-muted">Ignored / Quarantined</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{counts["ignored"] ?? 0}</CardContent></Card>
      </div>

      {legacyHits > 0 && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardHeader><CardTitle className="text-red-300">ISR dependency detected</CardTitle></CardHeader>
          <CardContent className="text-sm text-red-100">
            {legacyHits} UNPRO event(s) still hit the deprecated <code>stripe-isr-webhook</code>.
            Update the Stripe endpoint to <code>{EXPECTED_URL}</code>, then disable the old endpoint.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reconciliation</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={reconcileBusy}
              onClick={() => runReconcile(true)}>Dry-run</Button>
            <Button size="sm" disabled={reconcileBusy}
              onClick={() => runReconcile(false)}>Apply safe repairs</Button>
            <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
          </div>
        </CardHeader>
        {reconcileReport ? (
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(reconcileReport, null, 2)}
            </pre>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent events (100)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-readable-muted">Loading…</p> :
            rows.length === 0 ? <p className="text-readable-muted">No events recorded yet. Point Stripe to the new endpoint and resend a failed event.</p> :
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-readable-muted"><tr>
                  <th className="text-left py-1">Received</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Live</th>
                  <th className="text-left">Event ID</th>
                  <th className="text-left">Error</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-1">{new Date(r.received_at).toLocaleString()}</td>
                      <td>{r.event_type}</td>
                      <td>{r.processing_status}</td>
                      <td>{r.livemode ? "live" : "test"}</td>
                      <td className="font-mono">{r.stripe_event_id}</td>
                      <td className="text-red-300">{r.error_code || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}
