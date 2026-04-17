/**
 * PanelCalendarPermissionsExplainer — what we ask, why, and what we don't do.
 */
import { Eye, EyeOff, Lock } from "lucide-react";

export default function PanelCalendarPermissionsExplainer() {
  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Ce qu'on lit, ce qu'on ne touche pas</h4>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Eye className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">On lit :</span> vos plages occupées, pour proposer des heures libres.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <EyeOff className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">On ne lit pas :</span> les détails ni les invités de vos événements.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Vous gardez le contrôle :</span> rien n'est réservé sans votre confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
