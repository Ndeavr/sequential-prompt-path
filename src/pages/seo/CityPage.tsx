/**
 * UNPRO — City SEO Page
 * /city/:slug
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Home, Wrench, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityBySlug, getNearbyCityObjects } from "@/seo/data/cities";

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const city = getCityBySlug(slug || "");

  // Fetch contractor count for city
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

  // Fetch problems available for this city
  const { data: topProblems } = useQuery({
    queryKey: ["city-problems", slug],
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `UNPRO — ${city.name}`,
    description: `Trouvez des professionnels vérifiés à ${city.name}, ${city.province}. Rénovation, entretien et réparation résidentielle.`,
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "AdministrativeArea", name: city.province },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Professionnels à {city.name} — UNPRO</title>
        <meta name="description" content={`Trouvez des professionnels vérifiés à ${city.name}. ${city.housingHints} Obtenez des soumissions gratuites.`} />
        <link rel="canonical" href={`https://unpro.ca/city/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{city.name}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary">{city.region}</Badge>
          <Badge variant="outline">{city.province}</Badge>
          {contractorCount !== undefined && contractorCount > 0 && (
            <Badge variant="outline">{contractorCount} professionnels vérifiés</Badge>
          )}
        </div>

        <p className="text-lg text-muted-foreground mb-8">{city.housingHints}</p>

        {/* Climate context */}
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

        {/* Top Problems */}
        {topProblems && topProblems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Problèmes fréquents à {city.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topProblems.map((prob: any) => (
                <Link key={prob.slug} to={`/problems/${prob.slug}`} className="block">
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

        {/* Nearby cities */}
        {nearbyCities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Villes voisines</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map(c => (
                <Link key={c.slug} to={`/city/${c.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">{c.name}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Trouvez un professionnel à {city.name}</h2>
            <p className="text-muted-foreground mb-4">Comparez les meilleurs professionnels vérifiés de votre région.</p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <Wrench className="w-4 h-4" /> Rechercher
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CityPage;
