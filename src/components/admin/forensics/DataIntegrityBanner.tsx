/**
 * UNPRO — DATA INTEGRITY banner.
 * Enforces monotonic funnel invariants. If broken, admin sees the failing
 * query + record IDs instead of impossible aggregates.
 */
import { AlertTriangle } from "lucide-react";
import type { JourneyStateRow } from "@/hooks/useContractorJourney";

export default function DataIntegrityBanner({ rows }: { rows: JourneyStateRow[] }) {
  const sent = rows.filter(r => r.has_sms_sent).length;
  const delivered = rows.filter(r => r.has_sms_delivered).length;
  const clicked = rows.filter(r => r.has_clicked).length;
  const registered = rows.filter(r => r.has_registration_started).length;
  const paid = rows.filter(r => r.has_paid).length;

  const issues: { label: string; culprits: JourneyStateRow[] }[] = [];

  if (clicked > 0 && delivered < clicked) {
    issues.push({
      label: `clicked=${clicked} > delivered=${delivered} — Twilio delivery webhook n'écrit pas contractor_outreach_logs.status='delivered'.`,
      culprits: rows.filter(r => r.has_clicked && !r.has_sms_delivered),
    });
  }
  if (registered > 0 && clicked < registered) {
    issues.push({
      label: `registered=${registered} > clicked=${clicked} — attribution du click manquante.`,
      culprits: rows.filter(r => r.has_registration_started && !r.has_clicked),
    });
  }
  if (paid > 0 && registered < paid) {
    issues.push({
      label: `paid=${paid} > registered=${registered} — flag onboarding_started_at manquant.`,
      culprits: rows.filter(r => r.has_paid && !r.has_registration_started),
    });
  }

  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-red-300 font-semibold">
        <AlertTriangle className="w-4 h-4" />
        DATA INTEGRITY — invariants funnel violés
      </div>
      <ul className="space-y-2 text-sm">
        {issues.map((i, idx) => (
          <li key={idx}>
            <div className="text-red-200">{i.label}</div>
            {i.culprits.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {i.culprits.slice(0, 12).map(c => (
                  <span key={c.journey_key} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-100">
                    {c.company_name || c.phone || c.journey_key.slice(0, 8)}
                  </span>
                ))}
                {i.culprits.length > 12 && (
                  <span className="text-[10px] text-red-200/70">+{i.culprits.length - 12}</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
