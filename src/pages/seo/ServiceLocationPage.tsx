/**
 * UNPRO — Service Location SEO Page
 * With hero image, cost estimates, professional recommendations, and JSON-LD structured data.
 */

import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildServiceLocationPage } from "@/seo/services/seoContentService";
import { getServiceImage } from "@/seo/data/serviceImages";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, DollarSign, MapPin, Shield, Star, ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ServiceLocationPage = () => {
  const { category, city } = useParams<{ category: string; city: string }>();
  const data = category && city ? buildServiceLocationPage(category, city) : null;
  const imageSet = category ? getServiceImage(category) : null;

  // Inject JSON-LD
  useEffect(() => {
    if (!data?.jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-service-jsonld";
    document.getElementById("seo-service-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [data?.jsonLd]);

  if (!data) return <NotFound />;

  const fmt = (n: number) => n.toLocaleString("fr-CA");
  const canonicalUrl = `https://unpro.ca/services/${category}/${city}`;

  return (
    <MainLayout>
      <SeoHead
        title={data.metaTitle}
        description={data.metaDescription}
        canonical={canonicalUrl}
        ogImage={imageSet?.hero}
        ogType="article"
      />

      <article className="mesh-gradient noise-overlay">
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
            <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
            <span className="text-border">/</span>
            <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">{data.h1}</span>
          </nav>

          {/* Hero Image */}
          {imageSet && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="rounded-2xl overflow-hidden shadow-soft">
              <div className="relative">
                <img
                  src={imageSet.hero}
                  alt={imageSet.alt}
                  className="w-full h-[280px] md:h-[380px] object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg">{data.h1}</h1>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <MapPin className="h-3 w-3 mr-1" /> {city}
                    </Badge>
                    <Badge className="bg-primary/80 text-white border-0 backdrop-blur-sm">
                      {fmt(data.costEstimate.low)} $ — {fmt(data.costEstimate.high)} $
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* H1 (fallback if no image) + Intro */}
          <motion.header initial="hidden" animate="visible" variants={fadeUp}>
            {!imageSet && (
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{data.h1}</h1>
            )}
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{data.intro}</p>
          </motion.header>

          {/* Why it matters */}
          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-3">Pourquoi c'est important</h2>
              <p className="text-muted-foreground leading-relaxed">{data.whyItMatters}</p>
            </CardContent>
          </Card>

          {/* ─── Cost Estimate ─── */}
          <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Estimation des coûts
              </h2>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-foreground">{fmt(data.costEstimate.low)} $ — {fmt(data.costEstimate.high)} $</span>
                <span className="text-sm text-muted-foreground">/ {data.costEstimate.unit}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Estimation moyenne pour {data.h1.toLowerCase()}. Le prix final dépend de plusieurs facteurs :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.pricingFactors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Conseil UNPRO :</strong> Obtenez au minimum 3 soumissions détaillées pour comparer les prix et les approches. Notre IA peut analyser vos soumissions gratuitement.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* When to act */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Quand agir
            </h2>
            <div className="space-y-2">
              {data.whenToAct.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Professional Recommendation ─── */}
          <Card className="border-0 glass-card-elevated shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Trouver le bon professionnel
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Entrepreneurs vérifiés UNPRO</p>
                    <p className="text-sm text-muted-foreground">Licence RBQ validée, assurances vérifiées et score AIPP calculé pour chaque professionnel.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Analyse IA de soumissions</p>
                    <p className="text-sm text-muted-foreground">Notre IA compare vos soumissions au marché local et identifie les éléments manquants ou les prix inhabituels.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Expertise locale {city}</p>
                    <p className="text-sm text-muted-foreground">Entrepreneurs spécialisés dans votre région qui connaissent les particularités climatiques et réglementaires locales.</p>
                  </div>
                </div>
              </div>
              <Button asChild className="mt-5 w-full sm:w-auto">
                <Link to={data.searchUrl}>
                  Voir les entrepreneurs en {data.contractorType}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Local context */}
          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Contexte local — {city}
              </h2>
              <p className="text-muted-foreground leading-relaxed">{data.localContext}</p>
            </CardContent>
          </Card>

          {/* Growth CTAs */}
          <GrowthCtaBlock showAlex cityName={city} />

          {/* CTA */}
          <SeoCta searchUrl={data.searchUrl} cityName={city} serviceName={data.h1.split(" à ")[0]} />

          {/* Contractor acquisition */}
          <ContractorLandingCta />

          {/* FAQ */}
          <SeoFaqSection faqs={data.faqs} />

          {/* Internal links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SeoInternalLinks
              heading="Services connexes"
              links={data.relatedServicePages.map((p) => ({
                to: `/services/${p.slug}/${p.citySlug}`,
                label: p.label,
              }))}
            />
            <SeoInternalLinks
              heading="Problèmes reliés"
              links={data.relatedProblemPages.map((p) => ({
                to: `/problems/${p.slug}/${p.citySlug}`,
                label: p.label,
              }))}
            />
          </div>

          <SeoInternalLinks
            heading="Même service dans les villes voisines"
            links={data.nearbyCityPages.map((p) => ({
              to: `/services/${p.serviceSlug}/${p.slug}`,
              label: p.label,
            }))}
          />

          {/* Guides link */}
          <div className="pt-4 border-t border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-3">Guides utiles</h3>
            <div className="flex flex-wrap gap-2">
              <Link to="/guides/comment-choisir-couvreur"><Badge variant="secondary" className="rounded-full">Comment choisir un couvreur</Badge></Link>
              <Link to="/guides/verifier-soumission-isolation"><Badge variant="secondary" className="rounded-full">Vérifier une soumission</Badge></Link>
              <Link to="/guides/signes-probleme-fondation"><Badge variant="secondary" className="rounded-full">Problèmes de fondation</Badge></Link>
            </div>
          </div>
        </div>
      </article>
    </MainLayout>
  );
};

export default ServiceLocationPage;
