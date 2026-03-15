/**
 * UNPRO — Confidence & Trust Mini Panel
 * Compact display of identity confidence + public trust for embedding in profiles.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye } from "lucide-react";

interface ConfidenceAndTrustMiniPanelProps {
  identityConfidence: number | null;
  publicTrust: number | null;
  liveRiskDelta?: number | null;
  className?: string;
}

const getConfidenceColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-destructive";
};

export const ConfidenceAndTrustMiniPanel = ({
  identityConfidence,
  publicTrust,
  liveRiskDelta,
  className = "",
}: ConfidenceAndTrustMiniPanelProps) => {
  if (identityConfidence == null && publicTrust == null) return null;

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          {identityConfidence != null && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certitude</p>
                <p className={`text-base font-bold ${getConfidenceColor(identityConfidence)}`}>
                  {identityConfidence}%
                </p>
              </div>
            </div>
          )}
          {publicTrust != null && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confiance</p>
                <p className={`text-base font-bold ${getConfidenceColor(publicTrust)}`}>
                  {publicTrust}/100
                </p>
              </div>
            </div>
          )}
          {liveRiskDelta != null && liveRiskDelta !== 0 && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground">Δ Risque</p>
              <p className={`text-sm font-semibold ${liveRiskDelta < -10 ? "text-destructive" : liveRiskDelta < 0 ? "text-warning" : "text-success"}`}>
                {liveRiskDelta > 0 ? "+" : ""}{liveRiskDelta}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
