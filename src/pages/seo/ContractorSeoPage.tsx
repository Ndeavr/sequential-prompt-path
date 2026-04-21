/**
 * UNPRO — Contractor SEO Public Page
 * Route: /entrepreneur/:slug
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { getCanonicalUrl } from "@/seo/services/canonicalManager";
import { localBusinessSchema, breadcrumbSchema, injectJsonLd } from "@/lib/seoSchema";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Shield, Star, ArrowRight } from "lucide-react";
import InternalLinkGrid from "@/components/seo/InternalLinkGrid";

export default function ContractorSeoPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["contractor-seo", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_public_pages")
        .select("*, contractors(id, business_name, city, specialty_tags, bio, aipp_score_snapshot, license_rbq, website_url, phone)")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const contractor = data?.contractors as any;

  useEffect(() => {
    if (!contractor) return;
    const cleanups = [
      injectJsonLd(localBusinessSchema(contractor.business_name, contractor.city || "Québec")),
      injectJsonLd(breadcrumbSchema([
        { name: "Accueil", url: "https://unpro.ca" },
        { name: "Entrepreneurs", url: "https://unpro.ca/entrepreneurs" },
        { name: contractor.business_name, url: `https://unpro.ca/entrepreneur/${slug}` },
      ])),
    ];
    return () => cleanups.forEach(fn => fn());
  }, [contractor, slug]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Chargement…</div>
        </div>
      </MainLayout>
    );
  }

  if (!data || !contractor) {
    return (
      <MainLayout>
        <SeoHead title="Entrepreneur non trouvé | UNPRO" description="Ce profil n'existe pas ou n'est plus disponible." noindex />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Entrepreneur non trouvé</h1>
          <p className="text-muted-foreground mb-6">Ce profil n'est pas disponible.</p>
          <Link to="/search"><Button>Rechercher un entrepreneur</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const title = `${contractor.business_name} — Entrepreneur vérifié | UNPRO`;
  const desc = data.seo_description || `Profil vérifié de ${contractor.business_name}${contractor.city ? ` à ${contractor.city}` : ""}. Services, avis et disponibilité sur UNPRO.`;
  const specialties = Array.isArray(contractor.specialty_tags) ? contractor.specialty_tags : [];

  return (
    <MainLayout>
      <SeoHead title={title} description={desc} canonical={getCanonicalUrl(`/entrepreneur/${slug}`)} />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/entrepreneurs" className="hover:text-primary">Entrepreneurs</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{contractor.business_name}</span>
        </nav>

        {/* Hero */}
        <Card className="mb-8 border-primary/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold">{contractor.business_name}</h1>
                {contractor.city && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> {contractor.city}, QC
                  </p>
                )}
              </div>
              {contractor.aipp_score_snapshot && (
                <div className="text-center shrink-0">
                  <div className="text-3xl font-bold text-primary">{contractor.aipp_score_snapshot}</div>
                  <div className="text-xs text-muted-foreground">Score AIPP</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Shield className="w-3 h-3 mr-1" /> Vérifié UNPRO
              </Badge>
              {contractor.license_rbq && (
                <Badge variant="outline">RBQ : {contractor.license_rbq}</Badge>
              )}
            </div>

            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {specialties.map((s: string) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            )}

            {contractor.bio && (
              <p className="text-muted-foreground leading-relaxed">{contractor.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center mb-12">
          <Button size="lg" asChild>
            <Link to={`/contractors/${contractor.id}`}>
              Voir le profil complet <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Internal links */}
        <InternalLinkGrid city={contractor.city} category={specialties[0]} />
      </div>
    </MainLayout>
  );
}
