/**
 * UNPRO — Street SEO Page
 * /rue/:ville/:rue
 * Only renders when real property data exists — no thin pages.
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Home, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityBySlug } from "@/seo/data/cities";
import NotFound from "@/pages/NotFound";

const RuePage = () => {
  const { ville, rue } = useParams<{ ville: string; rue: string }>();
  const city = getCityBySlug(ville || "");
  const streetName = rue?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";

  // Fetch properties on this street
  const { data: properties, isLoading } = useQuery({
    queryKey: ["street-properties", ville, rue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, city, property_type, year_built, home_score")
        .ilike("city", `%${city?.name || ""}%`)
        .ilike("address", `%${streetName}%`)
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!city && !!rue,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Gate: minimum 3 properties for indexable page
  if (!city || !properties || properties.length < 3) {
    return <NotFound />;
  }

  const avgScore = properties.filter((p: any) => p.home_score).length > 0
    ? Math.round(properties.filter((p: any) => p.home_score).reduce((s: number, p: any) => s + (p.home_score || 0), 0) / properties.filter((p: any) => p.home_score).length)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{streetName}, {city.name} — UNPRO</title>
        <meta name="description" content={`${properties.length} propriétés sur ${streetName} à ${city.name}. Intelligence immobilière et tendances de rénovation.`} />
        <link rel="canonical" href={`https://unpro.ca/rue/${ville}/${rue}`} />
        {properties.length < 5 && <meta name="robots" content="noindex, follow" />}
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to={`/ville/${ville}`} className="hover:text-primary">{city.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{streetName}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <Home className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{streetName}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary">{city.name}</Badge>
          <Badge variant="outline">{properties.length} propriétés</Badge>
          {avgScore && <Badge variant="outline">Score moyen: {avgScore}/100</Badge>}
        </div>

        <p className="text-muted-foreground mb-8">
          Découvrez les tendances de rénovation et l'intelligence immobilière pour les propriétés sur {streetName} à {city.name}.
        </p>

        {/* Property list (anonymized) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {properties.map((p: any) => (
            <Card key={p.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{p.property_type || "Résidence"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.year_built ? `Construite en ${p.year_built}` : city.name}
                    {p.home_score ? ` · Score: ${p.home_score}/100` : ""}
                  </p>
                </div>
                {p.slug && (
                  <Link to={`/maison/${p.slug}`} className="text-primary">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Créez votre passeport maison</h2>
            <p className="text-muted-foreground mb-4">Suivez l'état de votre propriété et obtenez des recommandations personnalisées.</p>
            <Link to="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Commencer gratuitement
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RuePage;
