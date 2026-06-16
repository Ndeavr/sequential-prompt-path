import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

type Check = { id: string; label: string; ok: boolean };
type Audit = { score: number; status: string; callback_url: string; checks: Check[]; kpis: any };

export default function SmsAuditChecklist() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-infrastructure-audit", { body: {} });
      if (!error && data) setAudit(data as Audit);
    } finally { setLoading(false); }
  }
  useEffect(() => { run(); }, []);
  return (
    <Card className="glass-strong p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Autodiagnostic infrastructure</h2>
        <div className="flex items-center gap-2">
          {audit && <span className="text-sm font-mono text-readable-secondary">Score {audit.score}/100</span>}
          <button onClick={run} disabled={loading} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/15">
            {loading ? "Audit…" : "Réauditer"}
          </button>
        </div>
      </div>
      {!audit ? <p className="text-xs text-readable-muted">Chargement…</p> : (
        <ul className="space-y-1.5">
          {audit.checks.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              {c.ok
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <X className="w-4 h-4 text-rose-400" />}
              <span className={c.ok ? "" : "text-rose-200"}>{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
