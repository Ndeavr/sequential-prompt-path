import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionErrorBoundary } from "@/components/admin/SectionErrorBoundary";

type Counters = {
  imported: number;
  contactable: number;
  ready_for_contact: number;
  queued: number;
  has_website: number;
  no_contact: number;
};
type Prospect = {
  id: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  lead_status: string | null;
  city?: string | null;
  phone_type?: string | null;
};
type Report = { counters: Counters; top20: Prospect[]; fastest_10_activations: Prospect[] };

async function invoke<T = any>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error;
  return data as T;
}

function Card({ children, title, right }: { children: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function KV({ before, after, label }: { label: string; before?: number; after?: number }) {
  const delta = (after ?? 0) - (before ?? 0);
  const color = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-white/60";
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-white/70">{label}</span>
      <span className="tabular-nums text-white">
        {before ?? "—"} <span className="text-white/40">→</span> {after ?? "—"}
        {before !== undefined && after !== undefined && (
          <span className={`ml-2 text-xs ${color}`}>({delta >= 0 ? "+" : ""}{delta})</span>
        )}
      </span>
    </div>
  );
}

export default function PageAdminRecoverySprint() {
  const [before, setBefore] = useState<Counters | null>(null);
  const [after, setAfter] = useState<Counters | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [enrichAudit, setEnrichAudit] = useState<any>(null);
  const [queueAudit, setQueueAudit] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const r = await invoke<Report>("acq-recovery-report");
    setReport(r);
    return r;
  }, []);

  const snapshotBefore = useCallback(async () => {
    setErr(null);
    const r = await loadReport();
    setBefore(r.counters);
    setAfter(null);
  }, [loadReport]);

  const runAll = useCallback(async () => {
    setErr(null);
    try {
      setBusy("snapshot"); const r0 = await loadReport(); setBefore(r0.counters); setAfter(null);
      setBusy("enrich_audit"); setEnrichAudit(await invoke("acq-reenrich-leads", { execute: false }));
      setBusy("enrich_execute"); setEnrichAudit(await invoke("acq-reenrich-leads", { execute: true }));
      setBusy("queue_audit"); setQueueAudit(await invoke("acq-queue-repair", { execute: false }));
      setBusy("queue_execute"); setQueueAudit(await invoke("acq-queue-repair", { execute: true }));
      setBusy("report"); const r1 = await loadReport(); setAfter(r1.counters);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }, [loadReport]);

  useEffect(() => { loadReport().then((r) => setBefore(r.counters)).catch((e) => setErr(String(e?.message ?? e))); }, [loadReport]);

  return (
    <SectionErrorBoundary>
      <div className="min-h-screen admin-theme bg-[#050816] text-white">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">
          <header>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Recovery Sprint</h1>
            <p className="text-white/60 mt-1">Enrichment → Queue → Dispatch → Delivery. Execute the full recovery in one click.</p>
          </header>

          {err && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">{err}</div>}

          <div className="flex gap-3 flex-wrap">
            <button onClick={snapshotBefore} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm">Refresh snapshot</button>
            <button
              disabled={!!busy}
              onClick={runAll}
              className="px-4 py-2 rounded-full bg-amber-400 text-black text-sm font-semibold disabled:opacity-50"
            >
              {busy ? `Running: ${busy}…` : "Run recovery (LIVE)"}
            </button>
          </div>

          <Card title="Choke-point ladder — BEFORE vs AFTER">
            <KV label="Prospects imported" before={before?.imported} after={after?.imported ?? before?.imported} />
            <KV label="Has website" before={before?.has_website} after={after?.has_website ?? before?.has_website} />
            <KV label="No contact (phone & email null)" before={before?.no_contact} after={after?.no_contact ?? before?.no_contact} />
            <KV label="Contactable" before={before?.contactable} after={after?.contactable ?? before?.contactable} />
            <KV label="Ready for contact" before={before?.ready_for_contact} after={after?.ready_for_contact ?? before?.ready_for_contact} />
            <KV label="Queued (alex_outreach_queue pending)" before={before?.queued} after={after?.queued ?? before?.queued} />
          </Card>

          {enrichAudit && (
            <Card title={`Enrichment audit${enrichAudit.execute ? " (executed)" : " (dry-run)"}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 p-3"><div className="text-white/60">Before missing</div><div className="text-2xl">{enrichAudit.before_missing}</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-white/60">After missing</div><div className="text-2xl">{enrichAudit.after_missing}</div></div>
                <div className="rounded-xl bg-emerald-500/10 p-3"><div className="text-emerald-300/80">New phones</div><div className="text-2xl">{enrichAudit.new_phone_count}</div></div>
                <div className="rounded-xl bg-emerald-500/10 p-3"><div className="text-emerald-300/80">New emails</div><div className="text-2xl">{enrichAudit.new_email_count}</div></div>
              </div>
              <div className="mt-4">
                <div className="text-white/60 text-sm mb-2">Root cause ranking</div>
                <ol className="space-y-1 text-sm">
                  {(enrichAudit.root_cause_ranking ?? []).map((r: any, i: number) => (
                    <li key={r.bucket} className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-white/80">#{i + 1} {r.bucket}</span>
                      <span className="tabular-nums">{r.count}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          )}

          {queueAudit && (
            <Card title={`Queue repair${queueAudit.execute ? " (executed)" : " (dry-run)"}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 p-3"><div className="text-white/60">Contactable</div><div className="text-2xl">{queueAudit.total_contactable}</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-white/60">Was ready</div><div className="text-2xl">{queueAudit.before_ready}</div></div>
                <div className="rounded-xl bg-emerald-500/10 p-3"><div className="text-emerald-300/80">Promoted</div><div className="text-2xl">{queueAudit.promoted ?? 0}</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-white/60">Now ready</div><div className="text-2xl">{queueAudit.after_ready ?? "—"}</div></div>
              </div>
              {queueAudit.blocked_by_reason && (
                <div className="mt-3 text-sm text-white/70">
                  Blocked: {Object.entries(queueAudit.blocked_by_reason).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none"}
                </div>
              )}
            </Card>
          )}

          {report?.fastest_10_activations?.length ? (
            <Card title="Fastest path to first 10 activations">
              <ul className="space-y-1 text-sm">
                {report.fastest_10_activations.map((p) => (
                  <li key={p.id} className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-white truncate mr-2">{p.company_name ?? "—"}</span>
                    <span className="text-white/60 tabular-nums text-xs">
                      {p.phone ?? "—"} · {p.email ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {report?.top20?.length ? (
            <Card title="Top 20 recoverable prospects (ready_for_contact)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/50 text-left">
                    <tr><th className="py-1 pr-3">Company</th><th className="py-1 pr-3">Phone</th><th className="py-1 pr-3">Email</th><th className="py-1">Status</th></tr>
                  </thead>
                  <tbody>
                    {report.top20.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="py-1 pr-3 text-white">{p.company_name ?? "—"}</td>
                        <td className="py-1 pr-3 text-white/70 font-mono text-xs">{p.phone ?? "—"}</td>
                        <td className="py-1 pr-3 text-white/70 font-mono text-xs">{p.email ?? "—"}</td>
                        <td className="py-1 text-white/60 text-xs">{p.lead_status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </SectionErrorBoundary>
  );
}
