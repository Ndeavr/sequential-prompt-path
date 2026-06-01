/**
 * AnnotationChatSidebar — Findings list + recommended action panel.
 * Sits beside the canvas on desktop; renders as a stacked panel on mobile.
 */
import type { Annotation } from "./AIAnnotationLayer";
import UrgencyBadge from "./UrgencyBadge";

interface Props {
  findings: Annotation[];
  urgency?: "low" | "medium" | "high" | "critical";
  recommendation?: string;
  riskScore?: number;
}

const SEV_DOT: Record<Annotation["severity"], string> = {
  low: "bg-sky-400",
  medium: "bg-amber-400",
  high: "bg-rose-400",
  critical: "bg-red-500",
};

export default function AnnotationChatSidebar({ findings, urgency, recommendation, riskScore }: Props) {
  return (
    <aside className="rounded-[28px] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06]
      p-5 lg:p-6 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-base font-semibold tracking-tight">Analyse Alex</h2>
        {urgency && <UrgencyBadge level={urgency} />}
      </div>

      {typeof riskScore === "number" && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="text-white/55 text-[11px] uppercase tracking-wider mb-1">
            Risque estimé
          </div>
          <div className="text-white text-3xl font-semibold tracking-tight">
            {Math.round(riskScore * 100)}<span className="text-white/40 text-lg"> /100</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="text-white/55 text-[11px] uppercase tracking-wider mb-3">
          Constats ({findings.length})
        </div>
        <ul className="space-y-2">
          {findings.map((f, idx) => (
            <li key={f.id ?? idx}
              className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.025] border border-white/[0.05]">
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEV_DOT[f.severity]}`} />
              <p className="text-white/85 text-sm leading-snug">{f.label}</p>
            </li>
          ))}
          {findings.length === 0 && (
            <li className="text-white/45 text-sm italic">En attente d'analyse…</li>
          )}
        </ul>
      </div>

      {recommendation && (
        <div className="rounded-2xl bg-sky-500/10 border border-sky-400/20 p-4">
          <div className="text-sky-300 text-[11px] uppercase tracking-wider mb-1">
            Prochaine action
          </div>
          <p className="text-white text-sm leading-snug">{recommendation}</p>
        </div>
      )}
    </aside>
  );
}
