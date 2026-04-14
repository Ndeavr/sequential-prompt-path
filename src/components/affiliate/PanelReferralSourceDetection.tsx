/**
 * UNPRO — Referral Source Detection Panel
 * Shows the detected referral source with confidence indicator.
 */
import { Radar, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
  isDetecting: boolean;
  detected: boolean;
  affiliateName?: string;
  source?: string;
  confidenceScore?: number;
}

const PanelReferralSourceDetection = ({ isDetecting, detected, affiliateName, source, confidenceScore }: Props) => {
  if (isDetecting) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/20">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Détection de la source…</span>
      </div>
    );
  }

  if (!detected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 border border-border/10">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Aucun affilié détecté — visite directe</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
      <CheckCircle className="h-4 w-4 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">Référé par {affiliateName}</p>
        <p className="text-xs text-muted-foreground">
          Source: {source} · Confiance: {confidenceScore}%
        </p>
      </div>
    </div>
  );
};

export default PanelReferralSourceDetection;
