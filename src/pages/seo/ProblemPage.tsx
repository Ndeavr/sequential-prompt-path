/**
 * UNPRO — Problem SEO Page
 * /problems/:slug
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useHomeProblem, useProblemSolutions, useProblemImages } from "@/hooks/useKnowledgeGraph";
import { AlertTriangle, Wrench, DollarSign, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ProblemPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: problem, isLoading } = useHomeProblem(slug);
  const { data: solutions } = useProblemSolutions(problem?.id);
  const { data: images } = useProblemImages(problem?.id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Problème non trouvé</h1>
        <Link to="/problems" className="text-primary underline mt-4 inline-block">Voir tous les problèmes</Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: problem.seo_title_fr || problem.name_fr,
    description: problem.seo_description_fr || problem.description_fr,
    estimatedCost: problem.cost_estimate_low && problem.cost_estimate_high ? {
      "@type": "MonetaryAmount",
      currency: "CAD",
      minValue: problem.cost_estimate_low,
      maxValue: problem.cost_estimate_high,
    } : undefined,
    step: (solutions || []).map((edge: any, i: number) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: edge.home_solutions?.name_fr || `Étape ${i + 1}`,
      text: edge.home_solutions?.description_fr || "",
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Combien coûte la résolution de ${problem.name_fr} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Le coût estimé se situe entre ${problem.cost_estimate_low?.toLocaleString()}$ et ${problem.cost_estimate_high?.toLocaleString()}$ selon la sévérité et la complexité.`,
        },
      },
      {
        "@type": "Question",
        name: `Quelle est l'urgence de ce problème ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Ce problème a un score d'urgence de ${problem.urgency_score}/10. ${problem.urgency_score >= 8 ? "Une intervention rapide est recommandée." : problem.urgency_score >= 5 ? "À traiter dans un délai raisonnable." : "Peut être planifié dans le cadre de l'entretien régulier."}`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{problem.seo_title_fr || `${problem.name_fr} — UNPRO`}</title>
        <meta name="description" content={problem.seo_description_fr || problem.description_fr || ""} />
        <link rel="canonical" href={`https://unpro.ca/probleme/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/problems" className="hover:text-primary">Problèmes</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{problem.name_fr}</span>
        </nav>

        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{problem.name_fr}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Urgence: {problem.urgency_score}/10
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            Difficulté: {problem.difficulty_score}/10
          </Badge>
          {problem.cost_estimate_low && problem.cost_estimate_high && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {problem.cost_estimate_low.toLocaleString()}$ – {problem.cost_estimate_high.toLocaleString()}$
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-lg text-muted-foreground mb-8">{problem.description_fr}</p>

        {/* Images */}
        {images && images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {images.map((img: any) => (
              <img key={img.id} src={img.image_url} alt={img.alt_text_fr || problem.name_fr} className="rounded-lg w-full object-cover h-48" loading="lazy" />
            ))}
          </div>
        )}

        {/* Causes */}
        {problem.typical_causes && (problem.typical_causes as string[]).length > 0 && (
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-xl">Causes typiques</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(problem.typical_causes as string[]).map((cause: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    {cause}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Solutions */}
        {solutions && solutions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Solutions recommandées</h2>
            <div className="space-y-4">
              {solutions.map((edge: any) => {
                const sol = edge.home_solutions;
                if (!sol) return null;
                return (
                  <Card key={edge.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{sol.name_fr}</h3>
                          <p className="text-sm text-muted-foreground">{sol.description_fr}</p>
                          {sol.cost_estimate_low && sol.cost_estimate_high && (
                            <p className="text-sm text-primary mt-2">
                              {sol.cost_estimate_low.toLocaleString()}$ – {sol.cost_estimate_high.toLocaleString()}$
                            </p>
                          )}
                        </div>
                        <Link to={`/solutions/${sol.slug}`} className="text-primary hover:text-primary/80">
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                      {edge.is_primary && <Badge className="mt-2">Solution principale</Badge>}
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
              <h3 className="font-semibold text-foreground">Combien coûte la résolution ?</h3>
              <p className="text-sm text-muted-foreground">
                Le coût estimé se situe entre {problem.cost_estimate_low?.toLocaleString()}$ et {problem.cost_estimate_high?.toLocaleString()}$ selon la sévérité et la complexité du problème.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Quel professionnel contacter ?</h3>
              <p className="text-sm text-muted-foreground">
                Un spécialiste en {problem.professional_category?.replace(/-/g, " ")} est recommandé pour ce type de problème.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Est-ce urgent ?</h3>
              <p className="text-sm text-muted-foreground">
                {problem.urgency_score >= 8 ? "Oui, une intervention rapide est fortement recommandée." : problem.urgency_score >= 5 ? "Ce problème devrait être traité dans un délai raisonnable." : "Ce problème peut être planifié dans le cadre de l'entretien régulier."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Besoin d'un professionnel ?</h2>
            <p className="text-muted-foreground mb-4">Trouvez un expert vérifié pour résoudre ce problème.</p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <Star className="w-4 h-4" /> Trouver un professionnel
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProblemPage;
