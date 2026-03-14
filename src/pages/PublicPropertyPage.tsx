/**
 * UNPRO — Public Property Page
 * Route: /maison/:slug
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePublicProperty } from "@/hooks/usePublicProperty";
import { getStatusLabel } from "@/services/property/propertyService";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getNeighborhoodStats } from "@/services/property/neighborhoodService";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NeighborhoodMomentum } from "@/components/funnel/NeighborhoodMomentum";
import { NextBestAction } from "@/components/funnel/NextBestAction";
import {
  MapPin, BarChart3, ShieldCheck, UserPlus, HelpCircle,
  Home, Calendar, Ruler, Award, FileCheck, Hammer, ArrowRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  ShieldCheck,
  Award,
  FileCheck,
  Hammer,
};

export default function PublicPropertyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: property, isLoading, error } = usePublicProperty(slug);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background pt-20 px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !property) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-border/50">
            <CardContent className="p-8 text-center">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="font-display text-xl font-bold text-foreground mb-2">
                Propriété introuvable
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Cette adresse n'existe pas encore dans notre système.
                Recherchez votre propriété pour créer sa fiche.
              </p>
              <Button onClick={() => navigate("/")} variant="default">
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const status = getStatusLabel(property.public_status);
  const StatusIcon = ICON_MAP[status.icon] || BarChart3;
  const score = property.estimated_score;
  const displayAddress = property.full_address || property.address;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-20 pb-10 px-4 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 -z-10" />

          <div className="max-w-2xl mx-auto">
            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={status.color} className="gap-1.5 px-3 py-1">
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </Badge>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3 mb-6">
              <div className="mt-1 p-2 rounded-xl bg-primary/10 shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {displayAddress}
                </h1>
                {property.neighborhood && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {property.neighborhood}
                  </p>
                )}
              </div>
            </div>

            {/* Score Card */}
            <Card className="border-border/50 shadow-[var(--shadow-xl)] overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Score Circle */}
                  <div className="flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-primary/10 to-primary/5 min-w-[140px]">
                    <div className="relative">
                      <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28">
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke="hsl(var(--muted))"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(score || 0) * 2.64} 264`}
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-1000"
                        />
                        <text
                          x="50" y="46"
                          textAnchor="middle"
                          className="fill-foreground font-display text-2xl font-bold"
                        >
                          {score ?? "—"}
                        </text>
                        <text
                          x="50" y="62"
                          textAnchor="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          / 100
                        </text>
                      </svg>
                    </div>
                  </div>

                  {/* Score Details */}
                  <div className="flex-1 p-5 sm:p-6">
                    <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                      Home Score
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {score
                        ? "Ce score reflète une estimation de l'état général de la propriété basée sur les données publiques disponibles."
                        : "Aucun score n'est encore disponible. Réclamez cette propriété pour obtenir une évaluation personnalisée."}
                    </p>

                    {/* Property Details */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {property.property_type && (
                        <span className="flex items-center gap-1">
                          <Home className="h-3.5 w-3.5" />
                          {property.property_type}
                        </span>
                      )}
                      {property.year_built && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {property.year_built}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 pb-12">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* CTA: Claim */}
            <Card className="border-primary/20 bg-primary/[0.03] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground">
                      Je suis le propriétaire
                    </h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      Réclamez cette propriété pour accéder à votre Passeport Maison complet.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => {
                      if (isAuthenticated) {
                        navigate(`/dashboard/properties`);
                      } else {
                        navigate("/signup");
                      }
                    }}
                  >
                    Réclamer
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CTA: Create Account */}
            {!isAuthenticated && (
              <Card className="border-border/50 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent/10 shrink-0">
                      <UserPlus className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground">
                        Créer mon compte
                      </h3>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        Inscrivez-vous gratuitement pour gérer vos propriétés.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                      asChild
                    >
                      <Link to="/signup">
                        S'inscrire
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA: Understand Score */}
            <Card className="border-border/50 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-warning/10 shrink-0">
                    <HelpCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground">
                      Comprendre le score
                    </h3>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      Découvrez comment le Home Score évalue l'état de votre propriété.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1 text-muted-foreground"
                    onClick={() => navigate("/homeowners")}
                  >
                    En savoir plus
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <p className="text-center text-xs text-muted-foreground pt-4 max-w-md mx-auto">
              Le score estimé est basé sur les données publiques disponibles et ne remplace pas une inspection professionnelle.
              Les informations personnelles du propriétaire ne sont jamais affichées publiquement.
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
