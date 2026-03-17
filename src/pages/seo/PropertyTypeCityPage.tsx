/**
 * UNPRO — Property Type × City SEO Page
 * Route: /:city/:type
 * Localized property type page with problems, contractors, and cross-links.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildPropertyTypeCityPage } from "@/seo/services/propertyTypeContentService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, DollarSign, ArrowRight, MapPin, Wrench, Shield, Calendar } from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PropertyTypeCityPage = () => {
  const { city, type } = useParams<{ city: string; type: string }>();
  const data = type && city ? buildPropertyTypeCityPage(type, city) : null;

  useEffect(() => {
    if (!data?.jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-pt-city-jsonld";
    document.getElementById("seo-pt-city-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [data?.jsonLd]);

  if (!data) return <NotFound />;
  const { propertyType: pt, city: cityData } = data;

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} canonical={`/${cityData.slug}/${pt.urlSlug}`} />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-10">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Link to={`/ville/${cityData.slug}`} className="hover:text-foreground transition-colors">{cityData.name}</Link>
              <span>/</span>
              <Link to={`/types-de-propriete/${pt.urlSlug}`} className="hover:text-foreground transition-colors">{pt.nameFr}</Link>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {data.h1}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {data.intro}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {cityData.name}
              </Badge>
              {pt.requiresRegulatoryAttention && (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Conformité requise</Badge>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Local Context */}
      <section className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Contexte local — {cityData.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.localContext}</p>
          </CardContent>
        </Card>
      </section>

      {/* Problems */}
      <section className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Problèmes fréquents — {pt.nameFr} à {cityData.name}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.topProblems.map((problem, i) => (
            <motion.div key={problem.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { delay: i * 0.05, duration: 0.4 } } }}>
              <Link to={`/${cityData.slug}/${pt.urlSlug}/${problem.slug}`} className="block h-full">
                <Card className="h-full border-border/40 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {problem.nameFr}
                      </h3>
                      <Badge variant={problem.urgencyScore >= 8 ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                        Urgence {problem.urgencyScore}/10
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {problem.costLow.toLocaleString()}$ – {problem.costHigh.toLocaleString()}$
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 capitalize">
                        <Wrench className="h-3 w-3" />
                        {problem.contractorCategory.replace(/_/g, " ")}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contractor CTA */}
      <section className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-6 text-center space-y-4">
            <Shield className="h-8 w-8 text-accent mx-auto" />
            <h3 className="font-display text-xl font-bold text-foreground">
              Entrepreneurs vérifiés pour {pt.nameFr.toLowerCase()} à {cityData.name}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              UNPRO vérifie chaque entrepreneur. Rendez-vous exclusifs, jamais de leads partagés.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to={`/search?specialty=${pt.contractorBoosts[0]}&city=${cityData.name}`}>
                Trouver un entrepreneur
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Cross-links */}
      <section className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <SeoInternalLinks heading={`${pt.nameFr} dans les villes voisines`} links={data.nearbyCityLinks} />
        {data.relatedTypeLinks.length > 0 && (
          <SeoInternalLinks heading={`Autres types de propriété à ${cityData.name}`} links={data.relatedTypeLinks} />
        )}
      </section>

      {/* FAQ */}
      {data.faqs.length > 0 && (
        <section className="container max-w-4xl mx-auto px-4 py-8">
          <SeoFaqSection faqs={data.faqs} heading={`Questions fréquentes — ${pt.nameFr} à ${cityData.name}`} />
        </section>
      )}

      <section className="container max-w-4xl mx-auto px-4 py-10">
        <GrowthCtaBlock />
      </section>
      <ContractorLandingCta />
      <SeoCta />
    </MainLayout>
  );
};

export default PropertyTypeCityPage;
