import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProperty } from "@/hooks/useProperties";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading, error } = useProperty(id);

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (error || !property) return <DashboardLayout><ErrorState message="Propriété introuvable." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={property.address}
        description={[property.city, property.province].filter(Boolean).join(", ")}
        action={<Button asChild variant="outline"><Link to="/dashboard/properties">← Retour</Link></Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Détails</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Adresse" value={property.address} />
            <Row label="Ville" value={property.city} />
            <Row label="Province" value={property.province} />
            <Row label="Code postal" value={property.postal_code} />
            <Row label="Type" value={property.property_type} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Caractéristiques</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Année de construction" value={property.year_built?.toString()} />
            <Row label="Superficie" value={property.square_footage ? `${property.square_footage} pi²` : undefined} />
            {property.condition && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Condition</span>
                <Badge variant="outline">{property.condition}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value || "—"}</span>
  </div>
);

export default PropertyDetail;
