/**
 * UNPRO — Property Type Hub Page
 * SEO page: /types-de-propriete/:type
 * Premium design showcasing problems, costs, and contractor recommendations per property type.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildPropertyTypeHubPage } from "@/seo/services/propertyTypeContentService";
import { PROPERTY_FAMILY_LABELS } from "@/seo/data/propertyTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, DollarSign, ArrowRight, Home, Building, Wrench } from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PropertyTypeHubPage = () => {
  const { type } = useParams<{ type: string }>();
  const data = type ? buildPropertyTypeHubPage(type) : null;

  useEffect(() => {
    if (!data?.jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-pt-hub-jsonld";
    document.getElementById("seo-pt-hub-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [data?.jsonLd]);

  if (!data) return <NotFound />;
  const { propertyType: pt } = data;

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} canonical={`/types-de-propriete/${pt.urlSlug}`} />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-10">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/types-de-propriete" className="hover:text-foreground transition-colors">Types de propriété</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{pt.nameFr}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {data.h1}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {data.intro}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Home className="h-3 w-3" />
                {data.familyLabel}
              </Badge>
              {pt.isMultiUnit && <Badge variant="secondary">Multilogement</Badge>}
              {pt.requiresRegulatoryAttention && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Conformité requise</Badge>}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problems Grid */}
      <section className="container max-w-4xl mx-auto px-4 py-10 space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Problèmes fréquents — {pt.nameFr}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.topProblems.map((problem, i) => (
            <motion.div key={problem.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { delay: i * 0.05, duration: 0.4 } } }}>
              <Card className="h-full border-border/40 hover:border-primary/30 transition-colors group">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {problem.nameFr}
                    </h3>
                    <Badge variant={problem.urgencyScore >= 8 ? "destructive" : problem.urgencyScore >= 6 ? "secondary" : "outline"} className="text-[10px] shrink-0">
                      Urgence {problem.urgencyScore}/10
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      {problem.costLow.toLocaleString()}$ – {problem.costHigh.toLocaleString()}$
                    </span>
                    <span className="text-xs">/ {problem.costUnit}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wrench className="h-3 w-3" />
                    <span className="capitalize">{problem.contractorCategory.replace(/_/g, " ")}</span>
                    <span>•</span>
                    <span>{problem.bestSeason}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* City Links */}
      <section className="container max-w-4xl mx-auto px-4 py-8">
        <SeoInternalLinks heading={`${pt.nameFr} par ville`} links={data.topCityLinks} />
      </section>

      {/* Related Types */}
      {data.relatedTypes.length > 0 && (
        <section className="container max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Autres types — {data.familyLabel}
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.relatedTypes.map((rt) => (
              <Link key={rt.slug} to={`/types-de-propriete/${rt.urlSlug}`}>
                <Badge variant="outline" className="hover:bg-primary/5 cursor-pointer gap-1">
                  <Building className="h-3 w-3" />
                  {rt.nameFr}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {data.faqs.length > 0 && (
        <section className="container max-w-4xl mx-auto px-4 py-8">
          <SeoFaqSection faqs={data.faqs} heading={`Questions fréquentes — ${pt.nameFr}`} />
        </section>
      )}

      {/* CTA */}
      <section className="container max-w-4xl mx-auto px-4 py-10">
        <GrowthCtaBlock />
      </section>

      <SeoCta />
    </MainLayout>
  );
};

export default PropertyTypeHubPage;
