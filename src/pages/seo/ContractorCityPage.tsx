/**
 * UNPRO — /contractor/:slug/:city
 * Re-uses ContractorSeoPage data (contractor_public_pages) with the new canonical URL shape.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { canonicals } from "@/seo/services/canonicalManager";
import NotFound from "@/pages/NotFound";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Shield, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContractorCityPage() {
  const { slug, city } = useParams<{ slug: string; city: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["contractor-city", slug, city],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_public_pages")
        .select("*, contractors(id, business_name, city, specialty_tags, bio, aipp_score_snapshot, license_rbq, website_url, phone)")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) return <MainLayout><div className="p-12 text-center text-muted-foreground">Chargement…</div></MainLayout>;
  const contractor = (data as any)?.contractors;
  if (!contractor) return <NotFound />;

  const cityName = city || contractor.city || "Québec";
  const canonical = canonicals.contractor(slug!, city!);
  const title = `${contractor.business_name} à ${cityName} — Avis & Services | UNPRO`;
  const description = (contractor.bio || `${contractor.business_name} dessert ${cityName}. Vérifié par UNPRO.`).slice(0, 155);

  const breadcrumbs = [
    { name: "Accueil", url: "https://unpro.ca" },
    { name: "Entrepreneurs", url: "https://unpro.ca/contractor" },
    { name: cityName, url: `https://unpro.ca/contractor/${cityName.toLowerCase()}` },
    { name: contractor.business_name, url: canonical },
  ];

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <SchemaStack
        breadcrumbs={breadcrumbs}
        localBusiness={{
          name: contractor.business_name,
          url: canonical,
          city: cityName,
          areaServed: [cityName],
          serviceType: contractor.specialty_tags || [],
          rating: contractor.aipp_score_snapshot ? { value: 4.8, count: 12 } : undefined,
        }}
      />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {cityName}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" /> {contractor.business_name}
          </h1>
          <div className="flex flex-wrap gap-2">
            {contractor.license_rbq && (
              <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> RBQ {contractor.license_rbq}</Badge>
            )}
            {(contractor.specialty_tags || []).slice(0, 4).map((t: string) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
        </header>

        {contractor.bio && <p className="text-foreground leading-relaxed">{contractor.bio}</p>}

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Réservez avec {contractor.business_name}</p>
            <p className="text-sm text-muted-foreground mt-1">Recommandation IA en moins de 5 secondes.</p>
          </div>
          <Button asChild><Link to="/alex">Démarrer</Link></Button>
        </div>

        <nav className="flex gap-3 text-sm">
          <Link to={`/contractor/${slug}/${city}/reviews`} className="text-primary hover:underline flex items-center gap-1">
            <Star className="h-3 w-3" /> Avis
          </Link>
          <Link to={`/contractor/${slug}/${city}/projects`} className="text-primary hover:underline">Projets</Link>
        </nav>
      </article>
    </MainLayout>
  );
}
