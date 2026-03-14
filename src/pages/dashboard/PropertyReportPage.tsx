/**
 * UNPRO — Sale-Ready Property Passport Report
 * Owner-only report with property summary, score, history, components, certification.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProperty } from "@/hooks/useProperties";
import { getPassportOverview, getLevelBadge } from "@/services/property/passportService";
import { getCompletionStats } from "@/services/property/completionEngine";
import { getLatestCertification } from "@/services/property/certificationService";
import { getCertificationLabel } from "@/services/property/listingImportService";
import { getStatusLabel } from "@/services/property/propertyService";
import {
  FileText, Home, BarChart3, Shield, Award, Wrench,
  Zap, CheckCircle2, Calendar, MapPin, Printer,
} from "lucide-react";

export default function PropertyReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data: property, isLoading: propLoading } = useProperty(id);

  const { data: passport } = useQuery({
    queryKey: ["passport", id],
    queryFn: () => getPassportOverview(id!),
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["completion-stats", id],
    queryFn: () => getCompletionStats(id!),
    enabled: !!id,
  });

  const { data: certification } = useQuery({
    queryKey: ["certification", id],
    queryFn: () => getLatestCertification(id!),
    enabled: !!id,
  });

  if (propLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (!property) return <DashboardLayout><ErrorState message="Propriété introuvable." /></DashboardLayout>;

  const status = getStatusLabel(property.public_status);
  const certLabel = getCertificationLabel(property.certification_status || "not_eligible");
  const levelBadge = passport ? getLevelBadge(passport.level) : null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Rapport Passeport Maison"
        description="Rapport prêt pour la vente"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/properties/${id}/passport`}>← Passeport</Link>
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Imprimer
            </Button>
          </div>
        }
      />

      <div className="space-y-6 max-w-3xl print:max-w-full">
        {/* Property Summary */}
        <Card className="border-border/50 shadow-[var(--shadow-lg)]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {property.full_address || property.address}
                </h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {property.city && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{property.city}</span>
                  )}
                  {property.property_type && (
                    <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" />{property.property_type}</span>
                  )}
                  {property.year_built && (
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{property.year_built}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant={status.color}>{status.label}</Badge>
                  <Badge variant={certLabel.color}>{certLabel.label}</Badge>
                </div>
              </div>
              {property.estimated_score != null && (
                <div className="text-center shrink-0">
                  <span className="font-display text-3xl font-bold text-primary">{property.estimated_score}</span>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Passport Completion */}
        {passport && stats && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Complétion du Passeport
                {levelBadge && (
                  <span className={`text-sm ${levelBadge.color}`}>
                    {levelBadge.emoji} {passport.level}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={stats.pct} className="h-2.5 mb-3" />
              <p className="text-xs text-muted-foreground">
                {stats.completed} tâches complétées sur {stats.total} — {stats.pct}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sections Summary */}
        {passport && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Sections du Passeport
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {passport.sections.map((section) => (
                <div key={section.key} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-48 truncate">{section.label}</span>
                  <Progress value={section.completionPct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{section.completionPct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certification Badge */}
        <Card className={`border-border/50 ${certification?.certification_status === "certified" ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${certification?.certification_status === "certified" ? "bg-primary/10" : "bg-muted/50"}`}>
              {certification?.certification_status === "certified" ? (
                <Award className="h-6 w-6 text-primary" />
              ) : (
                <Shield className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-foreground">{certLabel.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{certLabel.description}</p>
              {certification?.expires_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expire le : {new Date(certification.expires_at).toLocaleDateString("fr-CA")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center max-w-md mx-auto print:text-left">
          Ce rapport est généré à partir des données disponibles dans le Passeport Maison UnPRO.
          Il ne remplace pas une inspection professionnelle. Les scores estimés sont basés sur 
          les informations fournies par le propriétaire et les sources publiques.
        </p>

        <p className="text-xs text-muted-foreground text-center print:text-left">
          Généré le {new Date().toLocaleDateString("fr-CA")} — UnPRO
        </p>
      </div>
    </DashboardLayout>
  );
}
