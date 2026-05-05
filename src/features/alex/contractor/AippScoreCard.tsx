/**
 * AippScoreCard — Circular score + tier + forces/faiblesses/quick wins.
 */
import { CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { useContractorStore } from "./contractorStore";

export default function AippScoreCard() {
  const aipp = useContractorStore((s) => s.aipp);
  if (!aipp) return null;

  const pct = Math.max(0, Math.min(100, aipp.aipp_score));
  const dash = (pct / 100) * 251.2; // 2*PI*40

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} 251.2`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold text-foreground leading-none">{pct}</span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Score AIPP</p>
          <p className="text-base font-semibold text-foreground">{aipp.tier}</p>
        </div>
      </div>

      {aipp.strengths.length > 0 && (
        <Section icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} title="Forces" items={aipp.strengths} />
      )}
      {aipp.weaknesses.length > 0 && (
        <Section icon={<AlertCircle className="w-3.5 h-3.5 text-amber-500" />} title="À améliorer" items={aipp.weaknesses} />
      )}
      {aipp.fastest_improvements.length > 0 && (
        <Section icon={<Zap className="w-3.5 h-3.5 text-primary" />} title="Quick wins" items={aipp.fastest_improvements} />
      )}
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon} {title}
      </div>
      <ul className="space-y-0.5 pl-5 list-disc text-xs text-muted-foreground">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
