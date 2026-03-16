/**
 * UNPRO — Problem Location SEO Page
 * With cost estimates, professional recommendations, and JSON-LD structured data.
 */

import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildProblemLocationPage } from "@/seo/services/seoContentService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, ShieldAlert, CheckCircle, MapPin, DollarSign, Shield, Star, ArrowRight } from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";
import { motion } from "framer-motion";

const urgencyColor: Record<string, string> = {
  Faible: "bg-secondary/10 text-secondary",
  Moyenne: "bg-accent/10 text-accent-foreground",
  Élevée: "bg-destructive/10 text-destructive",
  Critique: "bg-destructive text-destructive-foreground",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const WaveDivider = () => (
  <div className="wave-divider">
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
      <path d="M0 24C240 0 480 48 720 24C960 0 1200 48 1440 24V48H0Z" fill="hsl(var(--background))" />
    </svg>
  </div>
);

const ProblemLocationPage = () => {
  const { problem, city } = useParams<{ problem: string; city: string }>();
  const data = problem && city ? buildProblemLocationPage(problem, city) : null;

  // Inject JSON-LD
  useEffect(() => {
    if (!data?.jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-problem-jsonld";
    document.getElementById("seo-problem-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [data?.jsonLd]);

  if (!data) return <NotFound />;

  const fmt = (n: number) => n.toLocaleString("fr-CA");

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} />

      <article className="premium-bg">
        {/* ─── Hero section with gradient ─── */}
        <div className="relative hero-gradient noise-overlay overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto px-5 pt-8 pb-20 md:pt-12 md:pb-28 space-y-6">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium truncate">{data.h1}</span>
            </nav>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-2xl md:text-[2.5rem] font-extrabold text-foreground leading-tight tracking-[-0.02em]">
                  {data.h1}
                </h1>
                <Badge className={`${urgencyColor[data.urgency] ?? ""} rounded-full mt-1`}>
                  Urgence : {data.urgency}
                </Badge>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">{data.intro}</p>
            </motion.div>
          </div>
          <WaveDivider />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 space-y-8 pb-12">
          {/* ─── Problem / Solution cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-10">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="glass-card border-0 shadow-md h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Le Problème</h2>
                  </div>
                  <ul className="space-y-2">
                    {data.symptoms.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                        <span className="mt-1 h-1 w-1 rounded-full bg-destructive shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card className="glass-card border-0 shadow-md h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">La Solution</h2>
                  </div>
                  <ul className="space-y-2">
                    {data.whatToCheck.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                        <span className="mt-1 h-1 w-1 rounded-full bg-success shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ─── Cost Estimate ─── */}
          <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-soft">
            <CardContent className="p-5">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Estimation des coûts
              </h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-foreground">{fmt(data.costEstimate.low)} $ — {fmt(data.costEstimate.high)} $</span>
                <span className="text-xs text-muted-foreground">/ {data.costEstimate.unit}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Coût moyen pour résoudre ce problème à {city}. Le prix varie selon la gravité, l'accessibilité et les matériaux requis.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Conseil UNPRO :</strong> Prenez un rendez-vous exclusif avec un entrepreneur compétent et utilisez notre analyse IA gratuite pour valider les prix au marché local.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ─── Causes ─── */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" /> Causes fréquentes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.commonCauses.map((c, i) => (
                <Card key={i} className="glass-card border-0 shadow-xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">{c}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ─── Risks ─── */}
          <Card className="glass-card border-0 shadow-sm border-l-4 border-l-destructive/30">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Risques si non traité
              </h2>
              <ul className="space-y-2">
                {data.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-destructive font-bold mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ─── Professional Recommendation ─── */}
          <Card className="border-0 glass-card-elevated shadow-soft">
            <CardContent className="p-5">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Recommandation professionnelle
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Star className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Type de professionnel requis</p>
                    <p className="text-xs text-muted-foreground">
                      Pour résoudre ce problème, consultez un{" "}
                      {data.contractorTypes.map((t, i) => (
                        <span key={t}>
                          {i > 0 && (i === data.contractorTypes.length - 1 ? " ou " : ", ")}
                          <strong>{t}</strong>
                        </span>
                      ))}
                      {" "}vérifié à {city}.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Comparez avant de choisir</p>
                    <p className="text-xs text-muted-foreground">
                      Obtenez 3 soumissions minimum. UNPRO analyse chaque soumission avec l'IA pour identifier les écarts de prix et les éléments manquants.
                    </p>
                  </div>
                </div>
              </div>
              <Button asChild size="sm" className="mt-4 w-full sm:w-auto">
                <Link to={data.searchUrl}>
                  Trouver un professionnel à {city}
                  <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* ─── Local context ─── */}
          <Card className="glass-card border-0 shadow-sm">
            <CardContent className="p-5 space-y-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Contexte local — {city}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{data.localContext}</p>
            </CardContent>
          </Card>

          {/* Growth CTAs */}
          <GrowthCtaBlock showAlex cityName={city} />

          {/* CTA */}
          <SeoCta searchUrl={data.searchUrl} cityName={city} />

          {/* Contractor CTA */}
          <ContractorLandingCta />

          {/* FAQ */}
          <SeoFaqSection faqs={data.faqs} />

          {/* Internal links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SeoInternalLinks
              heading="Problèmes connexes"
              links={data.relatedProblemPages.map((p) => ({
                to: `/problems/${p.slug}/${p.citySlug}`,
                label: p.label,
              }))}
            />
            <SeoInternalLinks
              heading="Services recommandés"
              links={data.relatedServicePages.map((p) => ({
                to: `/services/${p.slug}/${p.citySlug}`,
                label: p.label,
              }))}
            />
          </div>

          <SeoInternalLinks
            heading="Même problème dans les villes voisines"
            links={data.nearbyCityPages.map((p) => ({
              to: `/problems/${p.problemSlug}/${p.slug}`,
              label: p.label,
            }))}
          />
        </div>
      </article>
    </MainLayout>
  );
};

export default ProblemLocationPage;
