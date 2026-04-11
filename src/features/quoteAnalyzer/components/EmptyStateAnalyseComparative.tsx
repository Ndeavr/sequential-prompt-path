import { Link } from "react-router-dom";
import { Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyStateAnalyseComparative() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Brain className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Aucune analyse de soumissions</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Importez jusqu'à 3 soumissions d'entrepreneurs pour les comparer avec l'IA.
      </p>
      <Button asChild className="rounded-xl gap-2">
        <Link to="/analyse-soumissions/importer">
          Analyser jusqu'à 3 soumissions <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
