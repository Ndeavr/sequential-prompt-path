/**
 * UNPRO — City SEO Page (French route: /ville/:slug)
 * Data-driven city page with problem/service cross-linking.
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Home, Wrench, ArrowRight, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityBySlug, getNearbyCityObjects } from "@/seo/data/cities";
import { SEO_PROBLEMS } from "@/seo/data/problems";
import { SEO_SERVICES } from "@/seo/data/services";
import SeoCta from "@/seo/components/SeoCta";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";

const VillePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const city = getCityBySlug(slug || "");

  const { data: contractorCount } = useQuery({
    queryKey: ["city-contractors-count", slug],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contractors")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified")
        .ilike("city", `%${city?.name || ""}%`);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!city,
  });

  const { data: topProblems } = useQuery({
    queryKey: ["city-problems-db", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_problems")
        .select("slug, name_fr, urgency_score, professional_category")
        .eq("is_active", true)
        .order("urgency_score", { ascending: false })
        .limit(12);
      if (error) return [];
      return data;
    },
    enabled: !!city,
  });

  if (!city) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">Ville non trouvée</h1>
        <Link to="/services" className="text-primary underline mt-4 inline-block">Voir toutes les villes</Link>
      </div>
    );
  }

  const nearbyCities = getNearbyCityObjects(city);

  // Build cross-links: top services for this city
  const topServices = SEO_SERVICES.slice(0, 8);
  const topStaticProblems = SEO_PROBLEMS.slice(0, 6);

  const serviceLinks = topServices.map((s) => ({
    to: `/services/${s.slug}/${city.slug}`,
    label: `${s.name} à ${city.name}`,
  }));

  const problemLinks = topStaticProblems.map((p) => ({
    to: `/probleme/${p.slug}/${city.slug}`,
    label: `${p.name} à ${city.name}`,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "City",
    name: city.name,
    description: `Professionnels vérifiés à ${city.name}, ${city.province}. Rénovation, entretien et réparation résidentielle.`,
    containedInPlace: { "@type": "AdministrativeArea", name: city.province },
    geo: { "@type": "GeoCoordinates" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Comment trouver un entrepreneur vérifié à ${city.name} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `UNPRO vérifie les licences RBQ, les assurances et les avis clients des entrepreneurs à ${city.name}. Recherchez par type de service pour comparer les profils.`,
        },
      },
      {
        "@type": "Question",
        name: `Quels sont les problèmes résidentiels les plus courants à ${city.name} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `À ${city.name}, les conditions (${city.climateTags.join(", ")}) causent fréquemment des problèmes d'infiltration, de toiture et d'isolation. ${city.housingHints}`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Professionnels vérifiés à {city.name} — UNPRO</title>
        <meta name="description" content={`Trouvez des professionnels vérifiés à ${city.name}. ${city.housingHints} Comparez les soumissions et vérifiez les licences.`} />
        <link rel="canonical" href={`https://unpro.ca/ville/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/services" className="hover:text-primary">Villes</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{city.name}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Professionnels à {city.name}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary">{city.region}</Badge>
          <Badge variant="outline">{city.province}</Badge>
          {contractorCount !== undefined && contractorCount > 0 && (
            <Badge variant="outline">{contractorCount} professionnels vérifiés</Badge>
          )}
        </div>

        <p className="text-lg text-muted-foreground mb-8">{city.housingHints}</p>

        {/* Climate */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Home className="w-5 h-5" /> Contexte climatique</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {city.climateTags.map((tag, i) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Ces conditions climatiques influencent les problèmes résidentiels les plus fréquents à {city.name}.
            </p>
          </CardContent>
        </Card>

        {/* DB-driven problems */}
        {topProblems && topProblems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Problèmes fréquents à {city.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topProblems.map((prob: any) => (
                <Link key={prob.slug} to={`/probleme/${prob.slug}`} className="block">
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{prob.name_fr}</p>
                        <p className="text-xs text-muted-foreground">{prob.professional_category?.replace(/-/g, " ")}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-xl">Questions fréquentes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Comment trouver un entrepreneur vérifié à {city.name} ?</h3>
              <p className="text-sm text-muted-foreground">
                UNPRO vérifie les licences RBQ, les assurances et les avis clients des entrepreneurs à {city.name}. Utilisez notre recherche par service pour comparer les profils et obtenir des soumissions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Quels problèmes résidentiels sont les plus courants ?</h3>
              <p className="text-sm text-muted-foreground">
                À {city.name}, les conditions climatiques ({city.climateTags.join(", ")}) causent fréquemment des problèmes de toiture, d'isolation et d'infiltration. {city.housingHints}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cross-links: Services */}
        <SeoInternalLinks heading={`Services populaires à ${city.name}`} links={serviceLinks} />

        {/* Cross-links: Problems */}
        <div className="mt-6">
          <SeoInternalLinks heading={`Problèmes courants à ${city.name}`} links={problemLinks} />
        </div>

        {/* Nearby cities */}
        {nearbyCities.length > 0 && (
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Villes voisines</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map((c) => (
                <Link key={c.slug} to={`/ville/${c.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">{c.name}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <SeoCta searchUrl={`/search?city=${encodeURIComponent(city.name)}`} cityName={city.name} />
      </div>
    </div>
  );
};

export default VillePage;
