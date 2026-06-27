import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Step = {
  step: number; name: string; status: "pass" | "fail" | "warn";
  latency_ms: number; http_status?: number; twilio_code?: string | number;
  request?: unknown; response?: unknown; error?: string; note?: string;
};
type Audit = { ok: boolean; verdict: { code: string; failing_step?: number; failing_name?: string; next_action: string }; trace: Step[] };

const ICON: Record<Step["status"], string> = { pass: "✓", fail: "✗", warn: "⚠" };
const COLOR: Record<Step["status"], string> = {
  pass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  fail: "text-red-300 border-red-500/40 bg-red-500/10",
  warn: "text-amber-300 border-amber-500/40 bg-amber-500/10",
};

export default function TwilioE2EAuditPanel() {
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [to, setTo] = useState("");

  const run = useCallback(async () => {
    setBusy(true); setErr(null); setAudit(null);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-e2e-audit", { body: to ? { to } : {} });
      if (error) throw error;
      setAudit(data as Audit);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }, [to]);

  return (
    <div className="border border-white/10 rounded p-3 space-y-3 bg-black/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold">Twilio E2E Audit — 10 steps</div>
          <p className="text-xs text-muted-foreground">Frontend → DB insert → Twilio API → webhook callback → dashboard read. Sends a real SMS and waits up to 60 s for delivery confirmation.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={to} onChange={(e) => setTo(e.target.value)}
            placeholder="+1514… (optional, defaults to ADMIN_TEST_PHONE)"
            className="text-xs rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 w-64"
          />
          <Button size="sm" variant="outline" onClick={run} disabled={busy}>
            {busy ? "Running (up to ~70s)…" : "Run Full E2E (10)"}
          </Button>
        </div>
      </div>

      {err && <div className="text-xs text-red-400 font-mono">{err}</div>}

      {audit && (
        <>
          <div className={`p-2 rounded text-sm border ${audit.verdict.code === "HEALTHY" ? COLOR.pass : audit.verdict.code.startsWith("WARN_") ? COLOR.warn : COLOR.fail}`}>
            <div className="font-semibold">Verdict: <code>{audit.verdict.code}</code></div>
            {audit.verdict.failing_name && (
              <div className="text-xs mt-1">Échec à l'étape {audit.verdict.failing_step}/10 — <code>{audit.verdict.failing_name}</code></div>
            )}
            <div className="text-xs mt-1 opacity-90">{audit.verdict.next_action}</div>
          </div>

          <div className="space-y-1">
            {audit.trace.map((s) => (
              <div key={s.step} className={`border rounded px-2 py-1.5 text-xs ${COLOR[s.status]}`}>
                <button
                  className="w-full flex items-center justify-between gap-2"
                  onClick={() => setExpanded((p) => ({ ...p, [s.step]: !p[s.step] }))}
                >
                  <span className="flex items-center gap-2 font-mono">
                    <span className="w-4 text-center">{ICON[s.status]}</span>
                    <span className="opacity-70">{String(s.step).padStart(2, "0")}</span>
                    <span className="font-semibold">{s.name}</span>
                  </span>
                  <span className="font-mono text-[10px] opacity-80 truncate max-w-[55%] text-right">
                    {s.latency_ms}ms{s.http_status ? ` · HTTP ${s.http_status}` : ""}{s.twilio_code ? ` · code ${s.twilio_code}` : ""}{s.error ? ` · ${s.error}` : ""}
                  </span>
                </button>
                {expanded[s.step] && (
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[10px] text-white/80">
{JSON.stringify({ request: s.request, response: s.response, note: s.note }, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
