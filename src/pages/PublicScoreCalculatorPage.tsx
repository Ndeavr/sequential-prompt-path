/**
 * UNPRO — Public Score Calculator
 * Route: /score-maison
 * Address input → estimated score → CTAs
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import MainLayout from "@/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { findPropertyByAddress, createProperty } from "@/services/property/propertyService";
import { calculateHomeScore, type HomeScoreInput } from "@/services/homeScoreService";
import { getNeighborhoodStats } from "@/services/property/neighborhoodService";
import { NeighborhoodMomentum } from "@/components/funnel/NeighborhoodMomentum";
import { NextBestAction, determineNextAction } from "@/components/funnel/NextBestAction";
import { recordDataAction } from "@/services/dataMoatService";
import {
  Search, Home, ArrowRight, ShieldCheck, UserPlus,
  BarChart3, AlertCircle, Loader2, TrendingUp,
} from "lucide-react";

export default function PublicScoreCalculatorPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [scoreResult, setScoreResult] = useState<ReturnType<typeof calculateHomeScore> | null>(null);
  const [propertySlug, setPropertySlug] = useState<string | null>(null);

  // Neighborhood stats for city (privacy-safe)
  const { data: neighborhoodStats } = useQuery({
    queryKey: ["neighborhood-stats-calc", city],
    queryFn: () => getNeighborhoodStats(city),
    enabled: !!city && city.length > 2,
    staleTime: 10 * 60 * 1000,
  });

  const lookupMutation = useMutation({
    mutationFn: async () => {
      // Try to find existing property
      const existing = await findPropertyByAddress(address);

      if (existing) {
        setPropertySlug(existing.slug);
        if (existing.city) setCity(existing.city);
        const input: HomeScoreInput = {
          yearBuilt: null,
          propertyType: null,
          squareFootage: null,
          condition: null,
          hasInspectionReports: false,
          uploadedDocumentCount: 0,
          quoteCount: 0,
          renovationCount: 0,
          recentRepairCount: 0,
        };
        return calculateHomeScore(input);
      }

      // No existing property — generate estimated score
      setPropertySlug(null);
      const input: HomeScoreInput = {
        yearBuilt: null,
        propertyType: null,
        squareFootage: null,
        condition: null,
        hasInspectionReports: false,
        uploadedDocumentCount: 0,
        quoteCount: 0,
        renovationCount: 0,
        recentRepairCount: 0,
      };
      return calculateHomeScore(input);
    },
    onSuccess: (result) => {
      setScoreResult(result);
    },
  });

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative pt-20 pb-12 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 -z-10" />
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <BarChart3 className="h-3.5 w-3.5" />
              Score estimé gratuit
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Score Maison
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
              Obtenez une estimation de l'état de votre propriété en quelques secondes.
              Plus d'informations améliorent la précision du score.
            </p>

            {/* Search */}
            <div className="flex gap-2 max-w-md mx-auto">
              <Input
                type="text"
                placeholder="Entrez une adresse..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && address.length > 5 && lookupMutation.mutate()}
              />
              <Button
                onClick={() => lookupMutation.mutate()}
                disabled={address.length < 5 || lookupMutation.isPending}
                className="gap-1.5"
              >
                {lookupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Analyser
              </Button>
            </div>
          </div>
        </section>

        {/* Results */}
        {scoreResult && (
          <section className="px-4 pb-16">
            <div className="max-w-xl mx-auto space-y-4">
              {/* Score Card */}
              <Card className="border-border/50 shadow-[var(--shadow-xl)] overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className="flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 min-w-[130px]">
                      <div className="text-center">
                        <span className="font-display text-4xl font-bold text-primary">
                          {scoreResult.overall}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                      </div>
                    </div>
                    <div className="flex-1 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="font-display text-lg font-semibold text-foreground">
                          {scoreResult.label}
                        </h2>
                        <Badge variant="secondary" className="text-xs">
                          Score estimé
                        </Badge>
                      </div>

                      {/* Factor bars */}
                      <div className="space-y-2 mt-3">
                        {scoreResult.factors.map((f) => (
                          <div key={f.key} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 truncate">{f.label}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${f.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground w-8 text-right">{f.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confidence notice */}
              <Card className="border-warning/20 bg-warning/[0.03]">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Score estimé — confiance {scoreResult.confidenceLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ce score est basé sur des données limitées. Créez votre Passeport Maison 
                      et ajoutez vos informations pour obtenir un score plus précis.
                      Ce score ne remplace pas une inspection professionnelle.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* CTAs */}
              {propertySlug && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => navigate(`/maison/${propertySlug}`)}
                >
                  <Home className="h-4 w-4" />
                  Voir la page de cette propriété
                </Button>
              )}

              <Card className="border-primary/20 bg-primary/[0.03]">
                <CardContent className="p-5 flex items-center gap-4">
                  <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-foreground">Complétez votre Passeport Maison</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Réclamez votre propriété et ajoutez vos données pour un score enrichi.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => navigate(isAuthenticated ? "/dashboard/properties" : "/signup")}
                  >
                    {isAuthenticated ? "Mon tableau de bord" : "Créer un compte"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>

              {!isAuthenticated && (
                <Card className="border-border/50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <UserPlus className="h-8 w-8 text-accent shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-foreground">Créer mon compte gratuit</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inscrivez-vous pour gérer vos propriétés et comparer des entrepreneurs.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => navigate("/signup")}>
                      S'inscrire
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              <p className="text-center text-xs text-muted-foreground pt-2">
                Le score estimé est basé sur les données publiques disponibles et ne constitue pas un avis professionnel.
              </p>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
