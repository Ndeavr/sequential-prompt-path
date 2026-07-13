/**
 * EligibilityPanel — Live recipient eligibility breakdown for the First Dollar
 * batch sender. Reads launch_leads, computes per-lead eligibility reason, and
 * exposes a one-click recovery for leads BLOCKED by transient stage timeouts.
 *
 * Canonical eligibility rules (matches first-dollar-send-batch):
 *  - lead_status IN ('SCORED','ENRICHED')
 *  - phone IS NOT NULL
 *  - sms_batch_id IS NULL
 *  - not opted out
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertCircle, CheckCircle2, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  company_name: string | null;
  phone: string | null;
  lead_status: string;
  block_reason: string | null;
  sms_batch_id: string | null;
  payload: Record<string, any> | null;
}

const ELIGIBLE_STATUSES = new Set(["SCORED", "ENRICHED"]);

type ExcludeReason =
  | "eligible"
  | "missing_phone"
  | "opted_out"
  | "already_claimed"
  | "blocked_stage_timeout"
  | "blocked_other"
  | "wrong_status";

interface LeadDiag extends Row {
  reason: ExcludeReason;
  reason_label: string;
}

function classify(r: Row): { reason: ExcludeReason; label: string } {
  const optedOut = r.payload?.opted_out === true || r.payload?.opted_out === "true";
  if (!r.phone) return { reason: "missing_phone", label: "numéro manquant" };
  if (optedOut) return { reason: "opted_out", label: "opt-out" };
  if (r.sms_batch_id) return { reason: "already_claimed", label: "déjà claim par batch" };
  if (ELIGIBLE_STATUSES.has(r.lead_status)) return { reason: "eligible", label: "éligible" };
  if (r.lead_status === "BLOCKED" && r.block_reason?.startsWith("stage_timeout:")) {
    return { reason: "blocked_stage_timeout", label: `timeout: ${r.block_reason.replace("stage_timeout:", "")}` };
  }
  if (r.lead_status === "BLOCKED") {
    return { reason: "blocked_other", label: r.block_reason ?? "bloqué" };
  }
  return { reason: "wrong_status", label: `statut: ${r.lead_status}` };
}

async function fetchDiagnostic() {
  const { data, error } = await supabase
    .from("launch_leads" as any)
    .select("id,company_name,phone,lead_status,block_reason,sms_batch_id,payload")
    .limit(50000);
  if (error) throw error;
  const rows = ((data ?? []) as unknown) as Row[];

  const diag: LeadDiag[] = rows.map(r => {
    const { reason, label } = classify(r);
    return { ...r, reason, reason_label: label };
  });

  const counts = {
    total: rows.length,
    eligible: 0,
    missingPhone: 0,
    optedOut: 0,
    alreadyClaimed: 0,
    blockedStageTimeout: 0,
    blockedOther: 0,
    wrongStatus: 0,
    byStatus: {} as Record<string, number>,
  };
  for (const d of diag) {
    counts.byStatus[d.lead_status] = (counts.byStatus[d.lead_status] ?? 0) + 1;
    switch (d.reason) {
      case "eligible": counts.eligible++; break;
      case "missing_phone": counts.missingPhone++; break;
      case "opted_out": counts.optedOut++; break;
      case "already_claimed": counts.alreadyClaimed++; break;
      case "blocked_stage_timeout": counts.blockedStageTimeout++; break;
      case "blocked_other": counts.blockedOther++; break;
      case "wrong_status": counts.wrongStatus++; break;
    }
  }

  const excluded = diag.filter(d => d.reason !== "eligible").slice(0, 50);
  return { counts, excluded };
}

export default function EligibilityPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["first-dollar-eligibility"],
    queryFn: fetchDiagnostic,
    refetchInterval: 20_000,
  });

  const recover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recover_blocked_launch_leads" as any);
      if (error) throw error;
      return data as { recovered_count: number };
    },
    onSuccess: (res) => {
      toast.success(`${res?.recovered_count ?? 0} lead(s) récupéré(s) → SCORED`);
      qc.invalidateQueries({ queryKey: ["first-dollar-eligibility"] });
      qc.invalidateQueries({ queryKey: ["first-dollar-funnel"] });
    },
    onError: (e: any) => toast.error(`Recovery échouée: ${e?.message ?? e}`),
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
        Chargement de l'éligibilité…
      </div>
    );
  }

  const { counts, excluded } = data;
  const zeroEligible = counts.eligible === 0;
  const statusEntries = Object.entries(counts.byStatus).sort((a, b) => b[1] - a[1]);
  const canRecover = counts.blockedStageTimeout > 0;

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${
      zeroEligible ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.03]"
    }`}>
      <div className="flex items-start justify-between gap-4">
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
              {counts.eligible} prospect{counts.eligible > 1 ? "s" : ""} éligible{counts.eligible > 1 ? "s" : ""} pour le prochain batch
            </h3>
          </div>
        </div>

        {canRecover && (
          <button
            onClick={() => recover.mutate()}
            disabled={recover.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-100 text-xs font-semibold transition disabled:opacity-50"
          >
            {recover.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Wrench className="h-4 w-4" />}
            Récupérer {counts.blockedStageTimeout} lead{counts.blockedStageTimeout > 1 ? "s" : ""} bloqué{counts.blockedStageTimeout > 1 ? "s" : ""} (timeout)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Line label="Total prospects" value={counts.total} />
        <Line label="Éligibles" value={counts.eligible} highlight />
        <Line label="Bloqués (timeout)" value={counts.blockedStageTimeout} amber={counts.blockedStageTimeout > 0} />
        <Line label="Bloqués (autre)" value={counts.blockedOther} muted />
        <Line label="Numéro manquant" value={counts.missingPhone} muted />
        <Line label="Déjà claim" value={counts.alreadyClaimed} muted />
        <Line label="Opt-out" value={counts.optedOut} muted />
        <Line label="Statut non éligible" value={counts.wrongStatus} muted />
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

      {excluded.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10 bg-white/[0.02]">
            {excluded.length} premier{excluded.length > 1 ? "s" : ""} lead{excluded.length > 1 ? "s" : ""} exclu{excluded.length > 1 ? "s" : ""}
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.02] text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Entreprise</th>
                  <th className="text-left px-3 py-2">Téléphone</th>
                  <th className="text-left px-3 py-2">Statut</th>
                  <th className="text-left px-3 py-2">Raison exclusion</th>
                </tr>
              </thead>
              <tbody>
                {excluded.map(l => (
                  <tr key={l.id} className="border-t border-white/5">
                    <td className="px-3 py-1.5 text-slate-200 truncate max-w-[220px]">
                      {l.company_name ?? <span className="text-slate-500 italic">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-slate-400 font-mono">
                      {l.phone ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[10px]">
                        {l.lead_status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                        l.reason === "blocked_stage_timeout"
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-white/5 text-slate-400"
                      }`}>
                        {l.reason_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {zeroEligible && !canRecover && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/[0.08] p-3 text-xs text-amber-100">
          <b>Aucun prospect mobile admissible.</b> Aucun lead récupérable via timeout — vérifier l'agent d'enrichissement ou débloquer manuellement les leads en statut non éligible.
        </div>
      )}

      {zeroEligible && canRecover && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/[0.08] p-3 text-xs text-amber-100">
          <b>{counts.blockedStageTimeout} lead(s) bloqués par timeout transient.</b> Cliquez sur "Récupérer" ci-dessus pour les repasser en <code>SCORED</code> et débloquer le batch.
        </div>
      )}
    </div>
  );
}

function Line({ label, value, muted, highlight, amber }: { label: string; value: number; muted?: boolean; highlight?: boolean; amber?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      highlight ? "border-emerald-400/40 bg-emerald-500/[0.06]"
        : amber ? "border-amber-400/40 bg-amber-500/[0.06]"
        : "border-white/10 bg-black/20"
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${
        highlight ? "text-emerald-200"
          : amber ? "text-amber-200"
          : muted ? "text-slate-400"
          : "text-slate-100"
      }`}>
        {value.toLocaleString("fr-CA")}
      </div>
    </div>
  );
}
