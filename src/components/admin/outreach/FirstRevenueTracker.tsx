/**
 * UNPRO — First Revenue Tracker
 * The one card that matters: are we generating first paid activations?
 */
import { AlertOctagon, DollarSign } from "lucide-react";
import type { FirstRevenueSnapshot } from "@/hooks/useOutreachCommandCenter";

interface Props {
  snapshot: FirstRevenueSnapshot | null | undefined;
  isLoading?: boolean;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "revenue" | "muted" }) {
  const color =
    tone === "revenue" ? "text-emerald-400" : tone === "muted" ? "text-readable-muted" : "text-readable";
  return (
    <div className="rounded-lg border border-border/20 bg-card/30 backdrop-blur-sm p-3">
      <div className="text-[10px] uppercase tracking-wider text-readable-muted">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export default function FirstRevenueTracker({ snapshot, isLoading }: Props) {
  const monthlyRevenueEstimate = (snapshot?.paid_plans_active ?? 0) * 349; // conservative Pro-plan mean
  const todayRevenue = (snapshot?.activations_today ?? 0) * 1; // $1 activation
  const alert = snapshot?.alert_no_activation_48h ?? true;

  return (
    <div className="rounded-2xl border border-border/20 bg-card/20 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        <h2 className="text-base font-semibold text-readable">First Revenue Tracker</h2>
      </div>

      {alert && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/15 p-3">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-red-300 uppercase tracking-wide">
              AUCUNE ACTIVATION DEPUIS 48 HEURES
            </div>
            <div className="text-xs text-red-200/80 mt-0.5">
              Le funnel ne convertit pas. Vérifier livraison SMS, priorisation, et taux de clic ci-dessous.
            </div>
          </div>
        </div>
      )}

      {isLoading || !snapshot ? (
        <div className="text-sm text-readable-muted">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Activations aujourd'hui" value={snapshot.activations_today} tone="revenue" />
          <Stat label="Revenu aujourd'hui" value={`${todayRevenue.toLocaleString("fr-CA")} $`} tone="revenue" />
          <Stat label="MRR estimé (30j)" value={`${monthlyRevenueEstimate.toLocaleString("fr-CA")} $`} tone="revenue" />
          <Stat label="Plans payants actifs" value={snapshot.paid_plans_active} />
          <Stat label="Contactés (7j)" value={snapshot.contacted_7d} tone="muted" />
          <Stat label="Inscriptions (7j)" value={snapshot.registrations_7d} tone="muted" />
          <Stat label="Profils complétés (7j)" value={snapshot.profiles_completed_7d} tone="muted" />
          <Stat label="Activations 1$ (7j)" value={snapshot.activations_7d} tone="muted" />
        </div>
      )}
    </div>
  );
}
