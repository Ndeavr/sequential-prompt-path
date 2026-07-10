/**
 * UNPRO — Abandonment Reason Engine card.
 */
import { AlertTriangle } from "lucide-react";
import type { AbandonmentAnalysis } from "@/hooks/useContractorJourney";

function formatDelay(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export default function AbandonmentReasonCard({ analysis }: { analysis: AbandonmentAnalysis }) {
  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-orange-100">Abandon détecté</h3>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Étape actuelle</dt>
          <dd className="font-semibold text-right">{analysis.currentStageLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Dernière activité</dt>
          <dd className="font-semibold text-right">il y a {formatDelay(analysis.minutesSinceLastActivity)}</dd>
        </div>
        {analysis.previousEvent && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Événement précédent</dt>
            <dd className="font-mono text-xs text-right">{analysis.previousEvent}</dd>
          </div>
        )}
        {analysis.nextExpectedEvent && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Prochaine action attendue</dt>
            <dd className="font-mono text-xs text-right">{analysis.nextExpectedEvent}</dd>
          </div>
        )}
        <div className="pt-2 border-t border-border/20">
          <dt className="text-muted-foreground text-xs mb-1">Blocage probable</dt>
          <dd className="font-semibold text-orange-100">{analysis.blocker}</dd>
        </div>
      </dl>
    </div>
  );
}
