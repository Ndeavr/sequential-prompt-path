/**
 * DuplicateWarning — shown when dedupe finds a match.
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { DedupeResponse } from "./useAddLead";

interface Props {
  match: NonNullable<DedupeResponse["match"]>;
  onView: () => void;
  onCancel: () => void;
  onProceed: () => void;
}

export function DuplicateWarning({ match, onView, onCancel, onProceed }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Ce prospect existe déjà.</p>
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            <div>Entreprise : {match.company_name ?? "—"}</div>
            <div>Statut : {match.lead_status}</div>
            <div>Correspondance : {match.reasons.join(", ")}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={onView}>Voir</Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" onClick={onProceed}>Créer quand même</Button>
      </div>
    </div>
  );
}
