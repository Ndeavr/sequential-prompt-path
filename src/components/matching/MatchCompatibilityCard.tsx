/**
 * MatchCompatibilityCard — 6-dimension compatibility breakdown.
 * Dark cinematic tokens only; no hardcoded colors.
 */
import { Check, X } from "lucide-react";

export type Dimension = {
  key: "project" | "budget" | "region" | "availability" | "communication" | "performance";
  label: string;
  score: number; // 0-100
  reason?: string;
};

interface Props {
  overallScore: number;
  dimensions: Dimension[];
  blockers?: string[];
  className?: string;
}

const DEFAULT_LABELS: Record<Dimension["key"], string> = {
  project: "Compatibilité projet",
  budget: "Compatibilité budget",
  region: "Compatibilité région",
  availability: "Compatibilité disponibilité",
  communication: "Compatibilité communication",
  performance: "Performance vérifiée",
};

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary/70"
        style={{ width: `${pct}%`, transition: "width 420ms cubic-bezier(.22,1,.36,1)" }}
      />
    </div>
  );
}

export default function MatchCompatibilityCard({ overallScore, dimensions, blockers = [], className = "" }: Props) {
  return (
    <section
      className={`rounded-[28px] p-6 backdrop-blur-2xl border border-white/5 ${className}`}
      style={{ background: "rgba(255,255,255,0.04)" }}
      aria-label="Analyse de compatibilité"
    >
      <header className="flex items-baseline justify-between mb-5">
        <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Compatibilité globale</h3>
        <div className="text-3xl font-semibold text-white tabular-nums">{Math.round(overallScore)}%</div>
      </header>

      <ul className="space-y-4">
        {dimensions.map((d) => (
          <li key={d.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/85">{d.label || DEFAULT_LABELS[d.key]}</span>
              <span className="text-white/70 tabular-nums text-xs">{Math.round(d.score)}%</span>
            </div>
            <Bar value={d.score} />
            {d.reason && <p className="text-xs text-white/55">{d.reason}</p>}
          </li>
        ))}
      </ul>

      {blockers.length > 0 && (
        <div className="mt-5 pt-5 border-t border-white/5 space-y-2">
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-white/70">
              <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 pt-4 border-t border-white/5 text-[11px] text-white/45 italic">
        Aucune recommandation n'est identique.
      </p>
    </section>
  );
}
