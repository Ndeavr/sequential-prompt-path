/**
 * UNPRO Condos — Building Profile Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyndicates } from "@/hooks/useSyndicate";
import { LoadingState, EmptyState } from "@/components/shared";
import { Building2, MapPin, Calendar, Users, Edit, Shield } from "lucide-react";

const CondoBuildingPage = () => {
  const { data: syndicates, isLoading } = useSyndicates();
  if (isLoading) return <CondoLayout><LoadingState /></CondoLayout>;

  const b = syndicates?.[0];
  if (!b) return <CondoLayout><EmptyState message="Aucun immeuble enregistré." icon={<Building2 className="h-10 w-10 text-primary/40" />} /></CondoLayout>;

  const fields = [
    { label: "Nom", value: b.name },
    { label: "Adresse", value: b.address || "—" },
    { label: "Ville", value: b.city || "—" },
    { label: "Province", value: b.province || "Québec" },
    { label: "Code postal", value: b.postal_code || "—" },
    { label: "Nombre d'unités", value: b.unit_count || "—" },
    { label: "Année de construction", value: (b as any).year_built || "—" },
    { label: "Type", value: (b as any).building_type === "horizontal" ? "Horizontal (townhouse)" : "Vertical" },
    { label: "Année fiscale", value: b.fiscal_year_start ? `Mois ${b.fiscal_year_start}` : "—" },
  ];

  return (
    <CondoLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Profil immeuble</h1>
          <p className="text-sm text-muted-foreground">Informations de votre copropriété</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl">
          <Edit className="h-4 w-4 mr-1.5" /> Modifier
        </Button>
      </div>

      <Card className="border-border/40 bg-card/80 mb-6">
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((f, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{f.label}</p>
                <p className="text-sm font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Assurance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Assureur</p>
              <p className="text-sm font-medium">{(b as any).insurance_provider || "Non renseigné"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Numéro de police</p>
              <p className="text-sm font-medium">{(b as any).insurance_policy_number || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renouvellement</p>
              <p className="text-sm font-medium">{(b as any).insurance_renewal_date || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-secondary" /> Statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Plan</span>
              <Badge variant="outline" className="capitalize">{(b as any).plan_tier || "Gratuit"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Loi 16</span>
              <Badge variant="outline" className={`${(b as any).loi16_inspection_done ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                {(b as any).loi16_inspection_done ? "Conforme" : "À vérifier"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Passeport</span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Actif</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </CondoLayout>
  );
};

export default CondoBuildingPage;
