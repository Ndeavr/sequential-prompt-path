import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/usePropertyPassport";
import PropertyCard from "@/components/property/PropertyCard";
import PropertyEmptyState from "@/components/property/PropertyEmptyState";
import { Plus } from "lucide-react";

const PropertiesList = () => {
  const { data: properties, isLoading } = useProperties();

  return (
    <DashboardLayout>
      <PageHeader
        title="Mes propriétés"
        description="Gérez vos propriétés, documents et diagnostics"
        action={
          <Button asChild>
            <Link to="/dashboard/properties/new">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : !properties?.length ? (
        <PropertyEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PropertiesList;
