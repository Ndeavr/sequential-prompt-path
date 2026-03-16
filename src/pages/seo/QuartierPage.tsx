/**
 * UNPRO — Neighborhood SEO Page
 * /quartier/:ville/:quartier
 * Only renders when sufficient data exists — no thin pages.
 */

import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Building2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityBySlug } from "@/seo/data/cities";
import { slugToDisplayName } from "@/lib/displayFormatters";
import NotFound from "@/pages/NotFound";

const QuartierPage = () => {
  const { ville, quartier } = useParams<{ ville: string; quartier: string }>();
  const city = getCityBySlug(ville || "");

  // Fetch neighborhood stats from DB (table may not exist yet)
  const { data: neighborhoodData, isLoading } = useQuery({
    queryKey: ["neighborhood-seo", ville, quartier],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("neighborhood_stats" as any)
          .select("*")
          .eq("city_slug", ville!)
          .eq("neighborhood_slug", quartier!)
          .maybeSingle();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!ville && !!quartier,
  });

  // Fetch property count for this neighborhood
  const { data: propertyCount } = useQuery({
    queryKey: ["neighborhood-property-count", ville, quartier],
    queryFn: async () => {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .ilike("city", `%${city?.name || ""}%`)
        .ilike("neighborhood", `%${quartier?.replace(/-/g, " ") || ""}%`);
      return count || 0;
    },
    enabled: !!city && !!quartier,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Gate: don't render thin pages
  if (!city || (!neighborhoodData && (propertyCount || 0) < 3)) {
    return <NotFound />;
  }

  const quartierName = slugToDisplayName(quartier || "");
  const pageTitle = `${quartierName}, ${city.name} — UNPRO`;
  const pageDesc = `Découvrez le quartier ${quartierName} à ${city.name}. Tendances de rénovation, professionnels locaux et intelligence immobilière.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={`https://unpro.ca/quartier/${ville}/${quartier}`} />
        {(!neighborhoodData && (propertyCount || 0) < 5) && <meta name="robots" content="noindex, follow" />}
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to={`/ville/${ville}`} className="hover:text-primary">{city.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{quartierName}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{quartierName}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary">{city.name}</Badge>
          <Badge variant="outline">{city.region}</Badge>
          {(propertyCount || 0) > 0 && (
            <Badge variant="outline">{propertyCount} propriétés actives</Badge>
          )}
        </div>

        {neighborhoodData && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                {(neighborhoodData as any).description_fr || `Le quartier ${quartierName} à ${city.name} fait partie de la région ${city.region}.`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Link back to city */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Explorer {city.name}</h2>
            <p className="text-muted-foreground mb-4">Trouvez des professionnels vérifiés dans votre secteur.</p>
            <Link to={`/ville/${ville}`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <MapPin className="w-4 h-4" /> Voir {city.name}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuartierPage;
