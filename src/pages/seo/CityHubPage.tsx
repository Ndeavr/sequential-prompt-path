/**
 * UNPRO — City SEO Hub Page
 * Route: /services/:city (e.g. /services/laval)
 */
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  MapPin, ArrowRight, MessageCircle, AlertTriangle, Wrench,
  Home, Droplets, Layers, Square, Building2, FileText,
} from "lucide-react";

const CATEGORIES = [
  { key: "toiture", label: "Toiture", icon: Home },
  { key: "isolation", label: "Isolation", icon: Layers },
  { key: "humidite", label: "Humidité et moisissure", icon: Droplets },
  { key: "fondation", label: "Fondations et drainage", icon: Layers },
  { key: "fenetres", label: "Fenêtres et calfeutrage", icon: Square },
  { key: "condo", label: "Condo et Loi 16", icon: Building2 },
  { key: "renovation", label: "Rénovation", icon: Wrench },
  { key: "inspection", label: "Inspection", icon: FileText },
];

export default function CityHubPage() {
  const { city } = useParams<{ city: string }>();
  const citySlug = city?.toLowerCase() || "";
  const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["seo-local-city", citySlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_local_pages")
        .select("slug, h1, urgency, cluster, service_category, intent_score, conversion_score")
        .ilike("city", citySlug)
        .eq("published", true)
        .order("intent_score", { ascending: false });
      return data || [];
    },
    enabled: !!citySlug,
  });

  const urgentPages = pages.filter(p => p.urgency === "high");
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    pages: pages.filter(p => p.cluster === cat.key || p.service_category === cat.key),
  })).filter(g => g.pages.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Services maison à {cityName} — problèmes, solutions et rendez-vous</title>
        <meta name="description" content={`Trouvez des solutions pour les problèmes de maison à ${cityName}. Toiture, isolation, fondation, condo et plus. Entrepreneurs vérifiés.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-primary/5 to-background px-4 py-12 md:py-20"
        >
          <div className="max-w-5xl mx-auto space-y-4 text-center">
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />{cityName}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
              Services maison à {cityName}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Problèmes, solutions et rendez-vous avec des entrepreneurs vérifiés à {cityName}.
            </p>
            <Button size="lg" asChild>
              <Link to="/alex">
                <MessageCircle className="mr-2 h-5 w-5" />
                Parler à Alex
              </Link>
            </Button>
          </div>
        </motion.section>

        <div className="max-w-5xl mx-auto px-4 pb-16 space-y-12">
          {/* Urgent problems */}
          {urgentPages.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-bold text-foreground">Problèmes urgents à {cityName}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {urgentPages.map(p => (
                  <PageCard key={p.slug} page={p} citySlug={citySlug} urgent />
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {grouped.map(cat => {
            const Icon = cat.icon;
            return (
              <section key={cat.key} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">{cat.label}</h2>
                  <Badge variant="outline">{cat.pages.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.pages.map(p => (
                    <PageCard key={p.slug} page={p} citySlug={citySlug} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">
                Besoin d'aide à {cityName}?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Décrivez votre problème et ajoutez une photo. Alex va analyser la situation et chercher le bon pro pour vous.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button size="lg" asChild>
                  <Link to="/alex"><MessageCircle className="mr-2 h-4 w-4" />Parler à Alex</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/decrire-projet">Demander une estimation</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function PageCard({ page, citySlug, urgent }: { page: any; citySlug: string; urgent?: boolean }) {
  return (
    <Link
      to={`/services/${citySlug}/${page.slug}`}
      className="group"
    >
      <Card className={`h-full transition-all hover:shadow-md ${urgent ? "border-red-500/30" : ""}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <ArrowRight className="h-4 w-4 text-primary mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
          <div>
            <p className="font-medium text-foreground text-sm leading-snug">{page.h1}</p>
            {page.service_category && (
              <span className="text-xs text-muted-foreground">{page.service_category}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
