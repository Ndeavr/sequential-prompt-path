import { useState } from "react";
import type { AippAuditViewModel } from "@/types/aippReal";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";

export default function AippDebugDrawer({ model }: { model: AippAuditViewModel }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card p-4 space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
      >
        <Bug className="h-4 w-4" />
        <span>Debug — Détails du scoring</span>
        {open ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {open && (
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-semibold mb-1">État</h4>
            <p>Status: {model.analysisStatus} | Confiance: {model.confidenceLevel}</p>
            <p>Sources: {model.validatedSourcesCount} | Signaux: {model.validatedSignalsCount}/{model.totalPossibleSignalsCount}</p>
            <p>Score: {model.overallScore ?? "null"} | Potentiel: {model.potentialScore ?? "null"}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Signaux bruts ({model.rawSignals?.length || 0})</h4>
            <div className="max-h-60 overflow-auto bg-muted/50 rounded p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-1 pr-2">Clé</th>
                    <th className="py-1 pr-2">Groupe</th>
                    <th className="py-1 pr-2">Trouvé</th>
                    <th className="py-1 pr-2">Points</th>
                    <th className="py-1">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {(model.rawSignals || []).map((s: any, i: number) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1 pr-2 font-mono">{s.key}</td>
                      <td className="py-1 pr-2">{s.group}</td>
                      <td className="py-1 pr-2">{s.found ? "✓" : "✗"}</td>
                      <td className="py-1 pr-2">{s.earnedPoints}/{s.maxPoints}</td>
                      <td className="py-1 text-muted-foreground">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {model.scoringDetails && (
            <div>
              <h4 className="font-semibold mb-1">Détails scoring</h4>
              <pre className="max-h-40 overflow-auto bg-muted/50 rounded p-2 text-[10px]">
                {JSON.stringify(model.scoringDetails, null, 2).slice(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
