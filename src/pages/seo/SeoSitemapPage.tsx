/**
 * UNPRO — SEO Sitemap Index
 * Public page listing all published SEO pages, grouped by type and city.
 */
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, AlertTriangle, ArrowRight } from "lucide-react";

export default function SeoSitemapPage() {
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["seo-sitemap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_pages")
        .select("slug, title, city, profession, page_type, h1")
        .eq("is_published", true)
        .order("city")
        .order("title");
      return data || [];
    },
  });

  // Group by city
  const byCity: Record<string, typeof pages> = {};
  for (const p of pages) {
    const city = p.city || "Autres";
    if (!byCity[city]) byCity[city] = [];
    byCity[city].push(p);
  }

  const professionPages = pages.filter(p => p.page_type === "profession_city");
  const problemPages = pages.filter(p => p.page_type === "problem_city");

  return (
    <MainLayout>
      <Helmet>
        <title>Plan du site SEO | UNPRO</title>
        <meta name="description" content="Toutes les pages locales UNPRO : entrepreneurs, problèmes de maison, villes desservies au Québec." />
      </Helmet>

      <div className="max-w-5xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-black text-foreground mb-2">Plan du site</h1>
        <p className="text-muted-foreground mb-8">
          {pages.length} pages locales couvrant {Object.keys(byCity).length} villes au Québec.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{professionPages.length}</p>
                <p className="text-sm text-muted-foreground">Pages métier × ville</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{problemPages.length}</p>
                <p className="text-sm text-muted-foreground">Pages problème × ville</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCity).sort().map(([city, cityPages]) => (
              <Card key={city}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {city}
                    <Badge variant="secondary" className="ml-auto">{cityPages.length} pages</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {cityPages.map((p) => (
                      <Link
                        key={p.slug}
                        to={`/s/${p.slug}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition text-sm group"
                      >
                        {p.page_type === "profession_city"
                          ? <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        }
                        <span className="text-foreground group-hover:text-primary transition truncate">
                          {p.h1 || p.title}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
