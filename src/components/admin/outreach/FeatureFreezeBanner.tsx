/**
 * UNPRO — Feature Freeze Banner
 * Informational. Shows which thresholds must go green before new feature work resumes.
 */
import { Snowflake, CheckCircle2, XCircle } from "lucide-react";
import { useFeatureFreezeStatus } from "@/lib/launch/featureFreeze";

export default function FeatureFreezeBanner() {
  const { frozen, thresholds } = useFeatureFreezeStatus();

  return (
    <div
      className={`rounded-2xl border p-4 ${
        frozen
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-emerald-500/40 bg-emerald-500/10"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Snowflake className={`w-4 h-4 ${frozen ? "text-amber-400" : "text-emerald-400"}`} />
        <h3 className="text-sm font-semibold text-readable">
          {frozen ? "Feature Freeze Actif" : "Feature Freeze Levé — Ready to Ship"}
        </h3>
      </div>
      <p className="text-xs text-readable-muted mb-3">
        Aucun nouveau module tant que les 4 seuils ne sont pas verts. Focus 100% sur le funnel de revenu.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {thresholds.map(t => (
          <div
            key={t.key}
            className={`rounded-lg border p-2 ${
              t.passing
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {t.passing ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              <div className="text-[10px] uppercase tracking-wider text-readable-muted">{t.label}</div>
            </div>
            <div className="text-lg font-bold tabular-nums text-readable">
              {t.value}
              {t.key !== "paid_activations_7d" && "%"}
            </div>
            <div className="text-[10px] text-readable-muted">cible {t.target}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
