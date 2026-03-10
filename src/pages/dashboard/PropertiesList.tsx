import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { Plus } from "lucide-react";

const PropertiesList = () => {
  const { data: properties, isLoading } = useProperties();

  return (
    <DashboardLayout>
      <PageHeader
        title="Mes propriétés"
        description="Gérez vos propriétés"
        action={<Button asChild><Link to="/dashboard/properties/new"><Plus className="h-4 w-4 mr-1" /> Ajouter</Link></Button>}
      />
      {isLoading ? <LoadingState /> : !properties?.length ? (
        <EmptyState message="Aucune propriété." action={<Button asChild><Link to="/dashboard/properties/new">Ajouter une propriété</Link></Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((p) => (
            <Link key={p.id} to={`/dashboard/properties/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-1">{p.address}</h3>
                  <p className="text-sm text-muted-foreground">{[p.city, p.province].filter(Boolean).join(", ")}</p>
                  <div className="flex gap-2 mt-3">
                    {p.property_type && <Badge variant="secondary">{p.property_type}</Badge>}
                    {p.condition && <Badge variant="outline">{p.condition}</Badge>}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    {p.year_built && <span>Construit en {p.year_built}</span>}
                    {p.square_footage && <span>{p.square_footage} pi²</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PropertiesList;
