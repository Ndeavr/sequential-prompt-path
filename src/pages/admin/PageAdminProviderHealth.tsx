/**
 * /admin/provider-health — Provider Auth Cockpit
 * Runs read-only auth probes against Twilio / Resend / Stripe / Lovable AI
 * and exposes the OUTREACH_ENABLED kill switch. Kill switch cannot be flipped
 * to ON while Twilio Auth = FAIL.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Power, ShieldAlert } from "lucide-react";

type CheckOutcome = {
  provider: string;
  check_name: string;
  status: "pass" | "fail" | "skipped";
  http_status?: number;
  latency_ms: number;
  error_body?: unknown;
  metadata?: Record<string, unknown>;
};

type Probe = {
  results: CheckOutcome[];
  secrets: Record<string, { present: boolean; length?: number; prefix_ok?: boolean | null; first4?: string; last4?: string }>;
  outreach_safe_to_enable: boolean;
};

export default function PageAdminProviderHealth() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);

  const { data: flag, refetch: refetchFlag } = useQuery({
    queryKey: ["outreach-flag"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_flags" as any)
        .select("*")
        .eq("key", "OUTREACH_ENABLED")
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  async function runProbe() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("provider-health-check", { body: {} });
      if (error) throw error;
      setProbe(data as Probe);
      qc.invalidateQueries({ queryKey: ["provider-health-history"] });
    } catch (e) {
      toast.error(`Probe failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { runProbe(); /* auto-run once */ }, []);

  async function toggleOutreach(next: boolean) {
    if (next && probe && !probe.outreach_safe_to_enable) {
      toast.error("Blocked: Twilio Auth must PASS before re-enabling outreach.");
      return;
    }
    try {
      const { error } = await supabase.rpc("set_system_flag" as any, {
        _key: "OUTREACH_ENABLED",
        _value: next,
      });
      if (error) throw error;
      toast.success(`OUTREACH_ENABLED = ${next ? "ON" : "OFF"}`);
      refetchFlag();
    } catch (e) {
      toast.error(`Toggle failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  const outreachOn = !!flag?.value;

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Provider Health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Read-only auth probes. No SMS sent. Kill switch controls every outreach edge function.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runProbe} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Re-probe
          </Button>
        </header>

        {/* Kill switch */}
        <Card className={outreachOn ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/10"}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Power className={outreachOn ? "w-6 h-6 text-emerald-400" : "w-6 h-6 text-red-400"} />
              <div>
                <div className="font-semibold">
                  OUTREACH_ENABLED = {outreachOn ? "ON" : "OFF (kill switch active)"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  While OFF, every outreach edge function short-circuits and logs `OUTREACH_DISABLED` instead of calling Twilio/Resend.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={outreachOn ? "outline" : "default"} onClick={() => toggleOutreach(true)}>
                Enable
              </Button>
              <Button size="sm" variant={outreachOn ? "destructive" : "outline"} onClick={() => toggleOutreach(false)}>
                Disable
              </Button>
            </div>
          </CardContent>
        </Card>

        {probe && !probe.outreach_safe_to_enable && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-400" />
            <div>
              <strong>Enable blocked:</strong> Twilio Auth is failing. Fix credentials before flipping the kill switch.
            </div>
          </div>
        )}

        {/* Probe results */}
        <Card>
          <CardHeader><CardTitle className="text-base">Latest probe</CardTitle></CardHeader>
          <CardContent>
            {!probe ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Probing…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Provider</th>
                    <th className="text-left">Check</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">HTTP</th>
                    <th className="text-left">Latency</th>
                    <th className="text-left">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {probe.results.map((r) => (
                    <tr key={`${r.provider}-${r.check_name}`} className="border-t border-border align-top">
                      <td className="py-2 font-mono">{r.provider}</td>
                      <td className="font-mono">{r.check_name}</td>
                      <td>
                        <Badge variant={r.status === "pass" ? "default" : r.status === "fail" ? "destructive" : "secondary"}>
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{r.http_status ?? "—"}</td>
                      <td>{r.latency_ms} ms</td>
                      <td className="max-w-md space-y-1">
                        {(() => {
                          const debug = (r.metadata as any)?.debug;
                          return (
                            <>
                              {debug?.request_url && (
                                <div className="text-[10px] font-mono opacity-80 break-all">
                                  <span className="opacity-60">URL:</span> {debug.request_url}
                                </div>
                              )}
                              {debug?.headers_used && (
                                <div className="text-[10px] font-mono opacity-60">
                                  headers: [{(debug.headers_used as string[]).join(", ")}]
                                </div>
                              )}
                              {r.error_body ? (
                                <pre className="bg-black/40 rounded p-2 text-[10px] overflow-x-auto whitespace-pre-wrap max-h-40">
                                  {JSON.stringify(r.error_body, null, 2)}
                                </pre>
                              ) : debug?.response_body_preview ? (
                                <pre className="bg-black/20 rounded p-2 text-[10px] overflow-x-auto whitespace-pre-wrap max-h-32 opacity-70">
                                  {debug.response_body_preview}
                                </pre>
                              ) : null}
                              {r.metadata && !debug && (
                                <pre className="text-[10px] opacity-80">{JSON.stringify(r.metadata)}</pre>
                              )}
                            </>
                          );
                        })()}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Secret shape */}
        {probe && (
          <Card>
            <CardHeader><CardTitle className="text-base">Secret presence &amp; shape</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Env var</th>
                    <th className="text-left">Present</th>
                    <th className="text-left">Length</th>
                    <th className="text-left">Prefix OK</th>
                    <th className="text-left">First4…Last4</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(probe.secrets).map(([name, s]) => (
                    <tr key={name} className="border-t border-border">
                      <td className="py-2 font-mono">{name}</td>
                      <td>
                        <Badge variant={s.present ? "default" : "destructive"}>{s.present ? "yes" : "no"}</Badge>
                      </td>
                      <td>{s.length ?? "—"}</td>
                      <td>{s.prefix_ok === null || s.prefix_ok === undefined ? "—" : s.prefix_ok ? "✅" : "❌"}</td>
                      <td className="font-mono opacity-80">{s.first4 && s.last4 ? `${s.first4}…${s.last4}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Values never leave the edge. First4/Last4 shown only to help spot the wrong secret was pasted.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
