/**
 * /admin/outreach-errors — Failure Command Center
 * Every SMS/email attempt with raw provider response, retryable flag, one-click retry + diagnose.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Bug, RotateCw } from "lucide-react";

type Log = {
  id: string;
  queue_id: string | null;
  channel: string;
  provider: string | null;
  status: string;
  recipient_raw: string | null;
  recipient_normalized: string | null;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean | null;
  provider_message_id: string | null;
  message_body: string | null;
  raw_response: unknown;
  attempt: number;
  is_test: boolean;
  created_at: string;
};

type QueueLite = {
  id: string;
  company_name: string;
  city: string | null;
  category: string | null;
};

export default function PageAdminOutreachErrors() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "sent">("failed");
  const [showTest, setShowTest] = useState(false);
  const [selected, setSelected] = useState<Log | null>(null);
  const [diagnosis, setDiagnosis] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-outreach-errors", statusFilter, showTest],
    refetchInterval: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("outreach_delivery_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (!showTest) q = q.eq("is_test", false);
      const [logsRes, flagRes] = await Promise.all([
        q,
        supabase.from("system_flags" as any).select("*").eq("key", "OUTREACH_ENABLED").maybeSingle(),
      ]);
      if (logsRes.error) throw logsRes.error;
      const logList = (logsRes.data ?? []) as unknown as Log[];

      const queueIds = Array.from(new Set(logList.map((l) => l.queue_id).filter(Boolean))) as string[];
      let queueMap: Record<string, QueueLite> = {};
      if (queueIds.length) {
        const { data: qs } = await supabase
          .from("contractor_outreach_queue" as any)
          .select("id, company_name, city, category")
          .in("id", queueIds);
        queueMap = Object.fromEntries(((qs ?? []) as unknown as QueueLite[]).map((r) => [r.id, r]));
      }
      return { logs: logList, queueMap, outreachEnabled: !!(flagRes.data as any)?.value };
    },
  });

  const logs = data?.logs ?? [];
  const queueMap = data?.queueMap ?? {};
  const outreachEnabled = data?.outreachEnabled ?? false;

  // Phone eligibility metrics (independent of delivery logs)
  const phoneMetricsQuery = useQuery({
    queryKey: ["admin-outreach-phone-metrics"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const QC = ["418","438","450","468","514","579","581","819","873","354","367","263"];
      const cnt = async (build: (q: any) => any) => {
        const { count } = await build(
          supabase.from("contractor_leads" as any).select("id", { count: "exact", head: true }),
        );
        return count ?? 0;
      };
      const [e164Valid, lookupSuccess, lookupUnavailable, stuckLegacy, eligibleMobile, eligibleTentative] = await Promise.all([
        cnt((q) => q.not("phone_e164", "is", null).neq("phone_validation_status", "invalid_phone")),
        cnt((q) => q.in("phone_type", ["mobile","landline","voip"])),
        cnt((q) => q.eq("phone_validation_status", "lookup_unavailable")),
        cnt((q) => q.in("phone_validation_status", ["lookup_failed","pending_validation"])),
        cnt((q) => q.eq("phone_type","mobile").not("sms_disabled","eq",true).not("do_not_contact","eq",true)),
        cnt((q) => q.eq("phone_validation_status","lookup_unavailable").in("phone_area_code", QC).not("sms_disabled","eq",true).not("do_not_contact","eq",true)),
      ]);
      return {
        e164Valid,
        lookupSuccess,
        lookupUnavailable: lookupUnavailable + stuckLegacy,
        eligibleForSms: eligibleMobile + eligibleTentative,
      };
    },
  });

  const stats = useMemo(() => {
    const failed = logs.filter((l) => l.status === "failed");
    const retryable = failed.filter((l) => l.retryable === true).length;
    const byCode = new Map<string, number>();
    for (const l of failed) {
      const k = l.error_code || "unknown";
      byCode.set(k, (byCode.get(k) ?? 0) + 1);
    }
    return {
      total: logs.length,
      failed: failed.length,
      retryable,
      topCodes: [...byCode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [logs]);

  async function relookupStuck() {
    setBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("outreach-relookup-stuck-phones", {
        body: { limit: 500 },
      });
      if (error) throw error;
      const r = res as any;
      toast.success(
        `Rechecked ${r?.rechecked ?? 0} · +${r?.promoted_to_valid ?? 0} sendable · ${r?.still_unavailable ?? 0} still unavailable · ${r?.real_invalid ?? 0} real invalid`,
      );
      phoneMetricsQuery.refetch();
    } catch (e) {
      toast.error(`Re-lookup failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function retryOne(log: Log) {
    if (!log.queue_id) return;
    setBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("outreach-retry-failed", {
        body: { ids: [log.queue_id] },
      });
      if (error) throw error;
      toast.success(`Retry queued: ${JSON.stringify(res).slice(0, 120)}`);
      qc.invalidateQueries({ queryKey: ["admin-outreach-errors"] });
    } catch (e) {
      toast.error(`Retry failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function retryAll() {
    setBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("outreach-retry-failed", {
        body: { all_retryable: true },
      });
      if (error) throw error;
      toast.success(`Retried ${(res as any)?.retried ?? 0} messages`);
      qc.invalidateQueries({ queryKey: ["admin-outreach-errors"] });
    } catch (e) {
      toast.error(`Retry failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function diagnose(log: Log) {
    setSelected(log);
    setDiagnosis(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("outreach-diagnose-failure", {
        body: { log_id: log.id },
      });
      if (error) throw error;
      setDiagnosis(res as Record<string, unknown>);
    } catch (e) {
      toast.error(`Diagnose failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Outreach Failure Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every send attempt with raw provider response. No hidden Twilio errors.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="rounded-lg bg-transparent border border-border px-2 py-1.5 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="failed">Failed only</option>
              <option value="sent">Sent only</option>
              <option value="all">All statuses</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} />
              Show test data
            </label>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={retryAll} disabled={busy || stats.retryable === 0 || !outreachEnabled}>
              <RotateCw className="w-4 h-4 mr-1" /> Retry {stats.retryable} retryable
            </Button>
          </div>
        </header>

        {!outreachEnabled && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-red-300">⛔ OUTREACH_ENABLED = OFF — retries are disabled.</div>
              <div className="text-xs text-red-200/80 mt-0.5">Flip the kill switch in Provider Health once Twilio auth passes.</div>
            </div>
            <a href="/admin/provider-health" className="text-xs underline text-red-100">Provider Health →</a>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Attempts (visible)", stats.total],
            ["Failed", stats.failed],
            ["Retryable", stats.retryable],
            ["Distinct codes", stats.topCodes.length],
          ].map(([label, v]) => (
            <Card key={label as string}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold mt-1">{v as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats.topCodes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Top failure codes</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {stats.topCodes.map(([code, n]) => (
                <Badge key={code} variant="outline" className="font-mono">
                  {code} · {n}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Delivery log</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No attempts matching filters.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground uppercase bg-white/5">
                  <tr>
                    <th className="text-left py-2 px-3">Company</th>
                    <th className="text-left px-2">City</th>
                    <th className="text-left px-2">Category</th>
                    <th className="text-left px-2">Phone (raw)</th>
                    <th className="text-left px-2">Normalized</th>
                    <th className="text-left px-2">Provider</th>
                    <th className="text-left px-2">Status</th>
                    <th className="text-left px-2">Code</th>
                    <th className="text-left px-2">Message</th>
                    <th className="text-left px-2">Retry?</th>
                    <th className="text-left px-2">When</th>
                    <th className="text-right px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const q = l.queue_id ? queueMap[l.queue_id] : null;
                    return (
                      <tr key={l.id} className="border-t border-border hover:bg-white/[0.03]">
                        <td className="py-2 px-3">{q?.company_name ?? "—"}</td>
                        <td className="px-2">{q?.city ?? "—"}</td>
                        <td className="px-2">{q?.category ?? "—"}</td>
                        <td className="px-2 font-mono">{l.recipient_raw ?? "—"}</td>
                        <td className="px-2 font-mono">{l.recipient_normalized ?? "—"}</td>
                        <td className="px-2">{l.provider ?? "—"}</td>
                        <td className="px-2">
                          <Badge variant={l.status === "sent" ? "default" : l.status === "failed" ? "destructive" : "secondary"}>
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-2 font-mono">{l.error_code ?? "—"}</td>
                        <td className="px-2 max-w-[280px] truncate" title={l.error_message ?? ""}>
                          {l.error_message ?? "—"}
                        </td>
                        <td className="px-2">
                          {l.retryable === null ? "—" : l.retryable ? (
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">yes</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-400 border-red-500/40">no</Badge>
                          )}
                        </td>
                        <td className="px-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("fr-CA")}</td>
                        <td className="px-3 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => diagnose(l)}>
                            <Bug className="w-3.5 h-3.5 mr-1" />Analyze
                          </Button>
                          {l.status === "failed" && l.retryable && (
                            <Button size="sm" variant="ghost" onClick={() => retryOne(l)} disabled={busy || !outreachEnabled}>
                              <RotateCw className="w-3.5 h-3.5 mr-1" />Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card className="border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Failure analysis · {selected.provider} · {selected.error_code ?? selected.status}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setDiagnosis(null); }}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {diagnosis ? (
                <>
                  <div><span className="text-muted-foreground">Prospect:</span> {(diagnosis.prospect as any)?.company_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-mono">{String(diagnosis.phone ?? "—")}</span> → <span className="font-mono">{String(diagnosis.phone_normalized ?? "—")}</span></div>
                  <div><span className="text-muted-foreground">Recommended action:</span> <strong>{String(diagnosis.recommended_action ?? "—")}</strong></div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
                </div>
              )}
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Message body</div>
                <pre className="bg-black/40 p-3 rounded text-xs overflow-x-auto">{selected.message_body ?? "—"}</pre>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Raw provider response</div>
                <pre className="bg-black/40 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.raw_response, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
