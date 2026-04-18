import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PipelineStageMetric } from "@/services/pipelineCommandCenterService";

const STAGE_LABELS: Record<string, string> = {
  market_selected: "Marché", city_selected: "Ville", contractor_extracted: "Extraction",
  website_resolved: "Domaine", enrichment_completed: "Enrichissement", score_generated: "Scoring",
  aipp_personalization: "AIPP", sequence_assigned: "Séquence", mailbox_selected: "Mailbox",
  email_sent: "Envoi", delivery_confirmed: "Livraison", reply_tracked: "Réponse",
  sms_fallback: "SMS fallback", consultation_booked: "RDV", subscription_completed: "Conversion",
};

export default function PanelPipelineStageOverview({ stages }: { stages: PipelineStageMetric[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> Volumes par étape (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune activité détectée sur 24h</p>
        ) : (
          <div className="space-y-2.5">
            {stages.slice(0, 12).map(s => {
              const total = s.total_count || 1;
              const successPct = (s.success_count / total) * 100;
              const failedPct = (s.failed_count / total) * 100;
              const blockedPct = (s.blocked_count / total) * 100;
              return (
                <div key={s.stage_key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{STAGE_LABELS[s.stage_key] ?? s.stage_key}</span>
                    <span className="text-muted-foreground tabular-nums">{s.total_count}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/40">
                    <div className="bg-emerald-500" style={{ width: `${successPct}%` }} />
                    <div className="bg-amber-500" style={{ width: `${blockedPct}%` }} />
                    <div className="bg-red-500" style={{ width: `${failedPct}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                    <span className="text-emerald-400">{s.success_count}✓</span>
                    {s.blocked_count > 0 && <span className="text-amber-400">{s.blocked_count}⏸</span>}
                    {s.failed_count > 0 && <span className="text-red-400">{s.failed_count}✗</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
