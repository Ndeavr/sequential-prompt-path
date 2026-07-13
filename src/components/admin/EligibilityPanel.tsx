/**
 * EligibilityPanel — Live recipient eligibility breakdown for the First Dollar
 * batch sender. Reads launch_leads and surfaces exactly why prospects are (or
 * aren't) eligible for the next 25-SMS batch.
 *
 * Canonical eligibility rules:
 *  - lead_status IN ('SCORED','ENRICHED')  (matches first-dollar-send-batch)
 *  - phone IS NOT NULL
 *  - sms_batch_id IS NULL  (not already claimed by a batch)
 *  - not opted out (payload->>'opted_out' <> 'true')
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface Row {
  lead_status: string;
  phone: string | null;
  sms_batch_id: string | null;
  payload: Record<string, any> | null;
}

const ELIGIBLE_STATUSES = new Set(["SCORED", "ENRICHED"]);

interface EligibilityCounts {
  total: number;
  missingPhone: number;
  alreadyClaimed: number;
  optedOut: number;
  wrongStatus: number; // lead_status not in eligible set
  eligible: number;
  byStatus: Record<string, number>;
}

async function fetchEligibility(): Promise<EligibilityCounts> {
  const { data, error } = await supabase
    .from("launch_leads" as any)
    .select("lead_status,phone,sms_batch_id,payload")
    .limit(50000);
  if (error) throw error;
  const rows = ((data ?? []) as unknown) as Row[];

  const c: EligibilityCounts = {
    total: rows.length,
    missingPhone: 0,
    alreadyClaimed: 0,
    optedOut: 0,
    wrongStatus: 0,
    eligible: 0,
    byStatus: {},
  };

  for (const r of rows) {
    c.byStatus[r.lead_status] = (c.byStatus[r.lead_status] ?? 0) + 1;
    const optedOut = r.payload?.opted_out === true || r.payload?.opted_out === "true";
    if (!r.phone) { c.missingPhone++; continue; }
    if (optedOut) { c.optedOut++; continue; }
    if (r.sms_batch_id) { c.alreadyClaimed++; continue; }
    if (!ELIGIBLE_STATUSES.has(r.lead_status)) { c.wrongStatus++; continue; }
    c.eligible++;
  }
  return c;
}

export default function EligibilityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["first-dollar-eligibility"],
    queryFn: fetchEligibility,
    refetchInterval: 20_000,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
        Chargement de l'éligibilité…
      </div>
    );
  }

  const zeroEligible = data.eligible === 0;
  const statusEntries = Object.entries(data.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${
      zeroEligible ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.03]"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${zeroEligible ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {zeroEligible ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider text-slate-400">Éligibilité recipients</span>
          </div>
          <h3 className="text-lg font-semibold text-white mt-0.5">
            {data.eligible} prospect{data.eligible > 1 ? "s" : ""} éligible{data.eligible > 1 ? "s" : ""} pour le prochain batch
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <Line label="Total prospects" value={data.total} />
        <Line label="Numéro manquant" value={data.missingPhone} muted />
        <Line label="Déjà claim par batch" value={data.alreadyClaimed} muted />
        <Line label="Opt-out" value={data.optedOut} muted />
        <Line label="Statut non éligible" value={data.wrongStatus} muted />
        <Line label="Éligibles pour ce batch" value={data.eligible} highlight />
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
        <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-2">
          Répartition par lead_status
        </div>
        <div className="flex flex-wrap gap-2">
          {statusEntries.map(([s, n]) => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded-full font-mono ${
                ELIGIBLE_STATUSES.has(s)
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              {s}: <b className="text-slate-100">{n}</b>
            </span>
          ))}
          {statusEntries.length === 0 && (
            <span className="text-slate-500">Aucun lead scrapé dans launch_leads.</span>
          )}
        </div>
      </div>

      {zeroEligible && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/[0.08] p-3 text-xs text-amber-100">
          <b>Aucun prospect mobile admissible.</b> Les prospects doivent être en statut <code>SCORED</code> ou <code>ENRICHED</code> avec un numéro et sans batch attribué. Vérifiez l'agent d'enrichissement ou dégelez des leads bloqués.
        </div>
      )}
    </div>
  );
}

function Line({ label, value, muted, highlight }: { label: string; value: number; muted?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      highlight ? "border-emerald-400/40 bg-emerald-500/[0.06]" : "border-white/10 bg-black/20"
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${
        highlight ? "text-emerald-200" : muted ? "text-slate-400" : "text-slate-100"
      }`}>
        {value.toLocaleString("fr-CA")}
      </div>
    </div>
  );
}
