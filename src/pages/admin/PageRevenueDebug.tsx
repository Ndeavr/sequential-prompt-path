/**
 * UNPRO — /admin/revenue-debug
 * Raw per-contractor 11-step event timeline. No aggregates, no percentages.
 * SMS SENT · DELIVERED · CLICKED · LANDING · REGISTRATION · OTP · PLAN · STRIPE STARTED · STRIPE SUCCESS · PROFILE · ACTIVATED
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useContactedContractors, type JourneyStateRow } from "@/hooks/useContractorJourney";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import DataIntegrityBanner from "@/components/admin/forensics/DataIntegrityBanner";

const STEPS: { key: keyof JourneyStateRow; label: string }[] = [
  { key: "has_sms_sent", label: "SMS SENT" },
  { key: "has_sms_delivered", label: "SMS DELIVERED" },
  { key: "has_clicked", label: "LINK CLICKED" },
  { key: "has_landing_view", label: "LANDING" },
  { key: "has_registration_started", label: "REGISTRATION" },
  { key: "has_step_company", label: "OTP / STEP 1" },
  { key: "has_step_pricing", label: "PLAN SELECTED" },
  { key: "has_checkout_started", label: "STRIPE STARTED" },
  { key: "has_checkout_opened", label: "STRIPE OPENED" },
  { key: "has_paid", label: "STRIPE SUCCESS" },
  { key: "has_activated", label: "ACTIVATED" },
];

function proximity(r: JourneyStateRow): number {
  if (r.has_paid && !r.has_activated) return 95;
  if (r.has_checkout_started) return 85;
  if (r.has_registration_started) return 70;
  if (r.has_clicked) return 40;
  if (r.has_sms_sent) return 10;
  return 0;
}

export default function PageRevenueDebug() {
  useAdminPageTracking();
  const { data = [], isLoading } = useContactedContractors();

  const sorted = useMemo(
    () => [...data].sort((a, b) => proximity(b) - proximity(a) || +new Date(b.last_activity_at) - +new Date(a.last_activity_at)),
    [data],
  );

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-readable">Revenue Debug — Raw Event Stream</h1>
          <p className="text-sm text-readable-muted mt-1">
            Un contractor par ligne. 11 étapes du SMS à l'activation. Aucun agrégat. Trié par proximité au revenu.
          </p>
        </div>

        <DataIntegrityBanner rows={data} />

        {isLoading ? (
          <div className="text-sm text-readable-muted">Chargement…</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-readable-muted">Aucun contractor tracké.</div>
        ) : (
          <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20 text-readable-muted">
                  <th className="text-left px-3 py-2 font-medium sticky left-0 bg-card/40 min-w-[220px]">Contractor</th>
                  {STEPS.map(s => (
                    <th key={s.key as string} className="px-2 py-2 font-medium whitespace-nowrap text-[10px] uppercase tracking-wider">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.journey_key} className="border-b border-border/10 hover:bg-muted/10">
                    <td className="px-3 py-2 sticky left-0 bg-card/40">
                      <Link to={`/admin/contractor/${encodeURIComponent(r.journey_key)}`} className="block">
                        <div className="font-medium text-readable">
                          {r.company_name || r.phone || r.email || r.journey_key.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-readable-muted font-mono">
                          {r.phone ?? "—"}
                        </div>
                      </Link>
                    </td>
                    {STEPS.map(s => {
                      const done = Boolean(r[s.key]);
                      return (
                        <td key={s.key as string} className="px-2 py-2 text-center">
                          {done ? (
                            <span className="inline-block w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 leading-6">✓</span>
                          ) : (
                            <span className="text-readable-muted/50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
