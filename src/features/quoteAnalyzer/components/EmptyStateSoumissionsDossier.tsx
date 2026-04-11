import { Link } from "react-router-dom";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyStateSoumissionsDossier() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <FolderOpen className="h-7 w-7 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Aucune soumission au dossier</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Ajoutez des soumissions d'entrepreneurs au dossier de la propriété pour le suivi documentaire.
      </p>
      <Button asChild variant="outline" className="rounded-xl gap-2">
        <Link to="/dossier-soumissions/ajouter">
          <Plus className="h-4 w-4" /> Ajouter une soumission au dossier
        </Link>
      </Button>
    </div>
  );
}
