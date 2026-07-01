/**
 * /admin/dispatch-bottleneck — audit + safe repair console for the acquisition dispatch layer.
 */
import { useEffect, useMemo, useState } from "react";
import { SectionErrorBoundary } from "@/components/admin/SectionErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, AlertTriangle, PlayCircle } from "lucide-react";

type Ladder = { key: string; label: string; count: number };
type Lead = {
  id: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  current_status: string | null;
  outreach_status: string | null;
  enrichment_status: string | null;
  validation_status: string | null;
  last_transition: string | null;
  blocked_reason: string;
  created_at: string;
};
type Audit = {
  generated_at: string;
  totals: { leads_loaded: number; sms_events_scanned: number; email_events_scanned: number };
  group_counts: Record<string, number>;
  ladder: Ladder[];
  collapse_at: string | null;
  twilio: { recent: any[]; health: any };
  resend: { recent: any[]; health: any };
  final: {
    root_cause: string;
    offending_table_or_function: string;
    prospects_recoverable_now: number;
    prospects_needing_manual: number;
    repair_sequence: string[];
  };
  per_lead: Lead[];
};

const ALL_ACTIONS = [
  "renormalize_phones",
  "retry_stuck_validation",
  "reenrich_missing_contact",
  "requeue_orphaned",
  "clear_dead_queue_locks",
  "restart_stalled_workers",
];

function Card({ children, className = "" }: any) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}>{children}</div>;
}

function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "muted"; children: any }) {
  const map = {
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    red: "bg-red-500/15 text-red-300 border-red-400/30",
    muted: "bg-white/5 text-white/70 border-white/10",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${map[tone]}`}>{children}</span>;
}

function Inner() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_ACTIONS.map((a) => [a, true])),
  );
  const [dryRun, setDryRun] = useState(true);
  const [repairResult, setRepairResult] = useState<any | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-bottleneck-audit", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAudit(data as Audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runRepair = async () => {
    setRepairing(true); setRepairResult(null);
    try {
      const actions = ALL_ACTIONS.filter((a) => selected[a]);
      const { data, error } = await supabase.functions.invoke("dispatch-bottleneck-repair", {
        body: { dry_run: dryRun, actions },
      });
      if (error) throw error;
      setRepairResult(data);
      if (!dryRun) load();
    } catch (e) {
      setRepairResult({ error: e instanceof Error ? e.message : String(e) });
    } finally { setRepairing(false); }
  };

  const filteredLeads = useMemo(() => {
    if (!audit) return [];
    if (filter === "all") return audit.per_lead.slice(0, 500);
    return audit.per_lead.filter((l) => l.blocked_reason === filter).slice(0, 500);
  }, [audit, filter]);

  const groupEntries = useMemo(() => {
    if (!audit) return [];
    return Object.entries(audit.group_counts).sort((a, b) => b[1] - a[1]);
  }, [audit]);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Dispatch Bottleneck</h1>
            <p className="text-sm opacity-70 mt-1">
              Import → Validation → Dispatch → Delivery. Read-only audit + safe repair, no messages sent.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-black text-sm font-medium disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </header>

        {error && (
          <Card className="border-red-400/30">
            <div className="flex items-center gap-2 text-red-300"><AlertTriangle className="h-4 w-4" />{error}</div>
          </Card>
        )}

        {audit && (
          <>
            <Card>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs opacity-60">Root cause</div>
                  <div className="text-base">{audit.final.root_cause}</div>
                  <div className="text-xs opacity-60 mt-1">
                    Offending: <span className="font-mono">{audit.final.offending_table_or_function}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Pill tone="green">Recoverable now: {audit.final.prospects_recoverable_now}</Pill>
                  <Pill tone="amber">Manual needed: {audit.final.prospects_needing_manual}</Pill>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-sm font-medium mb-3">Choke-point ladder</div>
              <div className="space-y-2">
                {audit.ladder.map((s) => {
                  const max = audit.ladder[0].count || 1;
                  const w = Math.max(2, Math.round((s.count / max) * 100));
                  const highlight = audit.collapse_at === s.key;
                  return (
                    <div key={s.key} className="flex items-center gap-3 text-sm">
                      <div className="w-56 opacity-80">{s.label}</div>
                      <div className="flex-1 h-6 rounded bg-white/5 overflow-hidden">
                        <div
                          className={`h-full ${highlight ? "bg-amber-400" : "bg-emerald-500/60"}`}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                      <div className="w-16 text-right tabular-nums">{s.count}</div>
                    </div>
                  );
                })}
              </div>
              {audit.collapse_at && (
                <div className="mt-3 text-sm text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> First collapse at <code>{audit.collapse_at}</code>
                </div>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <div className="text-sm font-medium mb-2">Twilio health</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Pill tone={audit.twilio.health.twilio_creds_present ? "green" : "red"}>creds</Pill>
                  <Pill tone={audit.twilio.health.queue_healthy ? "green" : "amber"}>queue 24h</Pill>
                  <Pill tone={(audit.twilio.health.delivery_rate_24h ?? 0) >= 0.7 ? "green" : "amber"}>
                    delivery 24h: {audit.twilio.health.delivery_rate_24h ?? "n/a"}
                  </Pill>
                </div>
                <div className="mt-3 max-h-48 overflow-auto text-xs">
                  {audit.twilio.recent.length === 0 ? (
                    <div className="opacity-60">No SMS events.</div>
                  ) : audit.twilio.recent.map((r, i) => (
                    <div key={i} className="border-b border-white/5 py-1">
                      <span className="font-mono">{r.recipient}</span> · {r.delivery_status}
                      {r.error_code ? <span className="text-red-300"> · {r.error_code}</span> : null}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="text-sm font-medium mb-2">Resend health</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Pill tone={audit.resend.health.resend_key_present ? "green" : "red"}>api key</Pill>
                  <Pill tone={audit.resend.health.verified_domain ? "green" : "amber"}>
                    domain: {audit.resend.health.verified_domain ?? "unset"}
                  </Pill>
                  <Pill tone={audit.resend.health.delivered_last500 > 0 ? "green" : "red"}>
                    delivered/500: {audit.resend.health.delivered_last500}
                  </Pill>
                </div>
                {audit.resend.health.last_send_error && (
                  <div className="mt-2 text-xs text-red-300">Last error: {audit.resend.health.last_send_error}</div>
                )}
                <div className="mt-3 max-h-48 overflow-auto text-xs">
                  {audit.resend.recent.length === 0 ? (
                    <div className="opacity-60">No email events.</div>
                  ) : audit.resend.recent.map((r, i) => (
                    <div key={i} className="border-b border-white/5 py-1">
                      <span className="font-mono">{r.recipient}</span> · {r.delivery_status}
                      {r.rejection_reason ? <span className="text-red-300"> · {r.rejection_reason}</span> : null}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Repair console</div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                  Dry-run
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                {ALL_ACTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected[a]} onChange={(e) => setSelected({ ...selected, [a]: e.target.checked })} />
                    <span className="font-mono">{a}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={runRepair}
                disabled={repairing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-black text-sm font-medium disabled:opacity-60"
              >
                {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Execute {dryRun ? "(dry-run)" : "(LIVE)"}
              </button>
              {repairResult && (
                <pre className="mt-3 text-xs bg-black/40 rounded p-3 overflow-auto max-h-72">
                  {JSON.stringify(repairResult, null, 2)}
                </pre>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-sm font-medium">
                  Prospects ({filteredLeads.length}/{audit.per_lead.length})
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm"
                >
                  <option value="all">All reasons</option>
                  {groupEntries.map(([k, v]) => (
                    <option key={k} value={k}>{k} ({v})</option>
                  ))}
                </select>
              </div>
              <div className="overflow-auto max-h-96 text-xs">
                <table className="w-full">
                  <thead className="text-left opacity-60 sticky top-0 bg-background">
                    <tr>
                      <th className="p-1">Company</th>
                      <th className="p-1">Phone</th>
                      <th className="p-1">Email</th>
                      <th className="p-1">Status</th>
                      <th className="p-1">Outreach</th>
                      <th className="p-1">Blocked reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => (
                      <tr key={l.id} className="border-t border-white/5">
                        <td className="p-1">{l.company_name ?? "—"}</td>
                        <td className="p-1 font-mono">{l.phone ?? "—"}</td>
                        <td className="p-1 font-mono">{l.email ?? "—"}</td>
                        <td className="p-1">{l.current_status}</td>
                        <td className="p-1">{l.outreach_status}</td>
                        <td className="p-1"><Pill tone={l.blocked_reason === "none" ? "green" : "amber"}>{l.blocked_reason}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function PageAdminDispatchBottleneck() {
  return (
    <SectionErrorBoundary title="Dispatch Bottleneck">
      <Inner />
    </SectionErrorBoundary>
  );
}
