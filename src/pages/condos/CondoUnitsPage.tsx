/**
 * UNPRO Condos — Units Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { useCondoRole } from "@/hooks/useCondoRole";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, User, AlertTriangle, CheckCircle2 } from "lucide-react";

const mockUnits = [
  { id: "1", number: "101", owner: "Marie Tremblay", status: "ok", openRequests: 0 },
  { id: "2", number: "102", owner: "Jean Lavoie", status: "issue", openRequests: 1 },
  { id: "3", number: "201", owner: "Sophie Gagné", status: "ok", openRequests: 0 },
  { id: "4", number: "202", owner: "Pierre Dubois", status: "issue", openRequests: 2 },
  { id: "5", number: "301", owner: "Anne Roy", status: "ok", openRequests: 0 },
  { id: "6", number: "302", owner: "Marc Bouchard", status: "ok", openRequests: 0 },
];

export default function CondoUnitsPage() {
  const { isOwner } = useCondoRole();

  const units = isOwner ? mockUnits.filter(u => u.number === "302") : mockUnits;

  return (
    <CondoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isOwner ? "Mes unités" : "Unités de l'immeuble"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner ? "Gérez vos unités de copropriété" : `${units.length} unités enregistrées`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <Card key={unit.id} className="border-border/30 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">#{unit.number}</p>
                    </div>
                  </div>
                  {unit.status === "issue" ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {unit.openRequests} demande{unit.openRequests > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {unit.owner}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CondoLayout>
  );
}
