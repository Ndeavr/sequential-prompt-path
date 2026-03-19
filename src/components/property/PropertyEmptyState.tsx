import { Link } from "react-router-dom";
import { Home, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 px-6 py-16 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 mb-5">
        <Home className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Créez votre premier Passeport Maison
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Centralisez vos documents, suivez l'état de votre propriété et recevez
        des recommandations personnalisées.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link to="/dashboard/properties/new">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une propriété
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
        {[
          { icon: Home, label: "Identité du bâtiment" },
          { icon: FileText, label: "Documents centralisés" },
          { icon: Home, label: "Score de santé" },
        ].map((f) => (
          <div key={f.label} className="rounded-xl bg-muted/20 p-3 text-center">
            <f.icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
