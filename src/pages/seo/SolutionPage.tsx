/**
 * UNPRO — Solution SEO Page
 * /solutions/:slug
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useHomeSolution, useSolutionProfessions } from "@/hooks/useKnowledgeGraph";
import { Wrench, DollarSign, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const SolutionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: solution, isLoading } = useHomeSolution(slug);
  const { data: professions } = useSolutionProfessions(solution?.id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Solution non trouvée</h1>
        <Link to="/solutions" className="text-primary underline mt-4 inline-block">Voir toutes les solutions</Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: solution.name_fr,
    description: solution.description_fr,
    estimatedCost: solution.cost_estimate_low && solution.cost_estimate_high ? {
      "@type": "MonetaryAmount",
      currency: "CAD",
      minValue: solution.cost_estimate_low,
      maxValue: solution.cost_estimate_high,
    } : undefined,
    totalTime: solution.time_estimate_hours ? `PT${solution.time_estimate_hours}H` : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{solution.name_fr} — UNPRO</title>
        <meta name="description" content={solution.description_fr || `${solution.name_fr} — Guide complet et professionnels recommandés.`} />
        <link rel="canonical" href={`https://unpro.ca/solution/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/solutions" className="hover:text-primary">Solutions</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{solution.name_fr}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{solution.name_fr}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {solution.diy_possible && (
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> DIY possible
            </Badge>
          )}
          {solution.cost_estimate_low && solution.cost_estimate_high && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {solution.cost_estimate_low.toLocaleString()}$ – {solution.cost_estimate_high.toLocaleString()}$
            </Badge>
          )}
          {solution.time_estimate_hours && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{solution.time_estimate_hours}h
            </Badge>
          )}
        </div>

        <p className="text-lg text-muted-foreground mb-8">{solution.description_fr}</p>

        {/* Professions */}
        {professions && professions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Professionnels recommandés</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professions.map((edge: any) => {
                const prof = edge.home_professions;
                if (!prof) return null;
                return (
                  <Card key={edge.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{prof.name_fr}</h3>
                          {prof.license_required && <Badge variant="secondary" className="mt-1 text-xs">Licence requise</Badge>}
                          {prof.typical_hourly_rate_low && prof.typical_hourly_rate_high && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {prof.typical_hourly_rate_low}$/h – {prof.typical_hourly_rate_high}$/h
                            </p>
                          )}
                        </div>
                        <Link to={`/profession/${prof.slug}`} className="text-primary hover:text-primary/80">
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQ */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-xl">Questions fréquentes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Quel est le coût de cette solution ?</h3>
              <p className="text-sm text-muted-foreground">
                Entre {solution.cost_estimate_low?.toLocaleString()}$ et {solution.cost_estimate_high?.toLocaleString()}$ selon la complexité.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Puis-je faire ce travail moi-même ?</h3>
              <p className="text-sm text-muted-foreground">
                {solution.diy_possible ? "Oui, ce travail peut être réalisé par un bricoleur expérimenté." : "Il est recommandé de faire appel à un professionnel qualifié."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Besoin d'aide ?</h2>
            <p className="text-muted-foreground mb-4">Trouvez un professionnel vérifié pour cette solution.</p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <Wrench className="w-4 h-4" /> Trouver un professionnel
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SolutionPage;
