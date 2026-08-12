/**
 * ReadinessMeter — recommendation-readiness score computed server-side from
 * facts UNPRO actually holds. Doubles as the completion checklist that drives
 * the "Corriger / compléter" path.
 */
import { Check, Circle } from "lucide-react";
import type { ActivationProfile } from "../types";

export default function ReadinessMeter({
  profile,
  onCorrect,
}: {
  profile: ActivationProfile;
  onCorrect?: () => void;
}) {
  const { score, checks } = profile.readiness;
  const missing = checks.filter((c) => !c.ok);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Prêt pour la recommandation IA</h2>
        <span className="text-2xl font-semibold tabular-nums text-white">{score}%</span>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-[width] duration-700"
          style={{ width: `${Math.max(4, score)}%` }}
        />
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-2 text-[12.5px]">
            {c.ok ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
            )}
            <span className={c.ok ? "text-white/80" : "text-white/45"}>{c.label}</span>
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">
          {missing.length} élément{missing.length > 1 ? "s" : ""} manquant
          {missing.length > 1 ? "s" : ""} limite{missing.length > 1 ? "nt" : ""} votre visibilité dans les
          recommandations UNPRO.
        </p>
      )}

      {onCorrect && (
        <button
          type="button"
          onClick={onCorrect}
          className="mt-3 text-[13px] font-medium text-sky-300 underline underline-offset-4 transition hover:text-sky-200"
        >
          Corriger / compléter mes informations
        </button>
      )}
    </section>
  );
}
