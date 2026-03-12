/**
 * UNPRO — Profession SEO Page
 * /profession/:slug
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useHomeProfession } from "@/hooks/useKnowledgeGraph";
import { Shield, DollarSign, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ProfessionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: profession, isLoading } = useHomeProfession(slug);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profession) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Profession non trouvée</h1>
        <Link to="/search" className="text-primary underline mt-4 inline-block">Rechercher un professionnel</Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Occupation",
    name: profession.name_fr,
    description: profession.description_fr,
    occupationLocation: { "@type": "Country", name: "Canada" },
    estimatedSalary: profession.typical_hourly_rate_low && profession.typical_hourly_rate_high ? {
      "@type": "MonetaryAmountDistribution",
      currency: "CAD",
      unitText: "HOUR",
      minValue: profession.typical_hourly_rate_low,
      maxValue: profession.typical_hourly_rate_high,
    } : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{profession.name_fr} au Québec — UNPRO</title>
        <meta name="description" content={profession.description_fr || `Trouvez un ${profession.name_fr} qualifié au Québec. Tarifs, qualifications et professionnels vérifiés.`} />
        <link rel="canonical" href={`https://unpro.ca/profession/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/search" className="hover:text-primary">Professionnels</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{profession.name_fr}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{profession.name_fr}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {profession.license_required && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Licence RBQ requise
            </Badge>
          )}
          {profession.typical_hourly_rate_low && profession.typical_hourly_rate_high && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {profession.typical_hourly_rate_low}$/h – {profession.typical_hourly_rate_high}$/h
            </Badge>
          )}
        </div>

        <p className="text-lg text-muted-foreground mb-8">{profession.description_fr}</p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tarifs horaires</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {profession.typical_hourly_rate_low}$ – {profession.typical_hourly_rate_high}$
              </p>
              <p className="text-sm text-muted-foreground">par heure, selon l'expérience et la région</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Qualifications</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {profession.license_required
                  ? "Ce métier requiert une licence de la Régie du bâtiment du Québec (RBQ)."
                  : "Aucune licence RBQ requise, mais une assurance responsabilité est recommandée."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-xl">Questions fréquentes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Comment choisir un bon {profession.name_fr.toLowerCase()} ?</h3>
              <p className="text-sm text-muted-foreground">
                Vérifiez la licence RBQ, les assurances, les avis clients et demandez des références de travaux similaires.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Quel est le tarif moyen ?</h3>
              <p className="text-sm text-muted-foreground">
                Entre {profession.typical_hourly_rate_low}$ et {profession.typical_hourly_rate_high}$ de l'heure au Québec.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Trouvez un {profession.name_fr.toLowerCase()} vérifié</h2>
            <p className="text-muted-foreground mb-4">Comparez les profils et obtenez des soumissions gratuites.</p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <Star className="w-4 h-4" /> Voir les professionnels
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfessionPage;
