/**
 * UNPRO — Property Grants Page
 * Shows grant eligibility per property with missing info flow.
 */
import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProperty } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchGrantPrograms,
  evaluateEligibility,
  saveEligibilityResults,
  getMissingFieldLabels,
  type EligibilityResult,
} from "@/services/grants/grantsEligibilityService";
import { motion } from "framer-motion";
import {
  DollarSign, CheckCircle, AlertTriangle, HelpCircle,
  XCircle, ExternalLink, ChevronRight, Info, Leaf,
} from "lucide-react";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  available: { icon: CheckCircle, color: "text-success", label: "Admissible" },
  maybe: { icon: HelpCircle, color: "text-warning", label: "Possiblement admissible" },
  insufficient_info: { icon: AlertTriangle, color: "text-muted-foreground", label: "Informations manquantes" },
  not_available: { icon: XCircle, color: "text-destructive", label: "Non admissible" },
  closed: { icon: XCircle, color: "text-muted-foreground", label: "Programme fermé" },
};

const PropertyGrantsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: property, isLoading: pLoading } = useProperty(id);

  const { data: programs, isLoading: gLoading } = useQuery({
    queryKey: ["grant-programs"],
    queryFn: fetchGrantPrograms,
  });

  const results = useMemo(() => {
    if (!property || !programs) return [];
    return evaluateEligibility(
      {
        id: property.id,
        property_type: property.property_type,
        year_built: property.year_built,
        city: property.city,
        province: property.province,
        square_footage: property.square_footage,
      },
      programs
    );
  }, [property, programs]);

  const saveMutation = useMutation({
    mutationFn: () => saveEligibilityResults(property!.id, user!.id, results),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grant-eligibility"] }),
  });

  const totalEstimated = results.reduce((s, r) => s + (r.estimatedAmount || 0), 0);
  const availableCount = results.filter((r) => r.status === "available" || r.status === "maybe").length;

  const isLoading = pLoading || gLoading;

  return (
    <DashboardLayout>
      <PageHeader
        title="Subventions disponibles"
        description="Programmes gouvernementaux pour votre propriété"
      />

      {isLoading ? (
        <LoadingState />
      ) : !property ? (
        <EmptyState message="Propriété introuvable." />
      ) : (
        <div className="space-y-5 max-w-3xl">
          {/* Summary Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50 shadow-[var(--shadow-lg)] overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-success/10 to-success/5 min-w-[140px]">
                    <Leaf className="h-8 w-8 text-success mb-2" />
                    <span className="font-display text-2xl font-bold text-foreground">{availableCount}</span>
                    <span className="text-xs text-muted-foreground">programme{availableCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex-1 p-5">
                    <h2 className="font-display text-base font-semibold text-foreground mb-1">
                      {property.address}
                    </h2>
                    {totalEstimated > 0 && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Jusqu'à <strong className="text-foreground">{totalEstimated.toLocaleString("fr-CA")} $</strong> en subventions estimées
                      </p>
                    )}
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Ces estimations sont basées sur les informations disponibles. Complétez votre Passeport Maison pour des résultats plus précis.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grant Cards */}
          {results.map((result, i) => (
            <GrantCard key={result.programId} result={result} program={programs?.find((p) => p.id === result.programId)} index={i} propertyId={id!} />
          ))}

          {results.length === 0 && (
            <EmptyState message="Aucun programme de subvention trouvé pour votre type de propriété." />
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

function GrantCard({
  result, program, index, propertyId,
}: {
  result: EligibilityResult;
  program: any;
  index: number;
  propertyId: string;
}) {
  const config = statusConfig[result.status] || statusConfig.insufficient_info;
  const Icon = config.icon;
  const missingLabels = getMissingFieldLabels(result.missingFields);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {result.nameFr}
              </CardTitle>
              {program?.provider && (
                <CardDescription className="mt-0.5">{program.provider}</CardDescription>
              )}
            </div>
            <Badge
              variant={result.status === "available" ? "default" : "secondary"}
              className="text-xs shrink-0"
            >
              <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Confiance</span>
              <span className="font-medium">{result.confidence}%</span>
            </div>
            <Progress value={result.confidence} className="h-1.5" />
          </div>

          {/* Estimated amount */}
          {result.estimatedAmount != null && result.estimatedAmount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-success" />
              <span>Estimation : <strong>{result.estimatedAmount.toLocaleString("fr-CA")} $</strong></span>
            </div>
          )}

          {/* Recommendation */}
          <p className="text-xs text-muted-foreground leading-relaxed">{result.recommendation}</p>

          {/* Missing fields */}
          {missingLabels.length > 0 && (
            <div className="pt-2 border-t border-border/20">
              <p className="text-xs font-medium text-foreground mb-1.5">
                Informations manquantes :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingLabels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
              <Button asChild size="sm" variant="outline" className="mt-2 gap-1 text-xs">
                <Link to={`/dashboard/properties/${propertyId}/passport`}>
                  Compléter <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}

          {/* Program link */}
          {program?.program_url && (
            <a
              href={program.program_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Détails du programme <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default PropertyGrantsPage;
