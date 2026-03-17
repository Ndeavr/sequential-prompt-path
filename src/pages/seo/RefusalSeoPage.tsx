/**
 * UNPRO — Refusal-Driven SEO Page
 * Dynamic page rendered from contractor refusal intelligence.
 */
import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { useRefusalSeoPage } from "@/hooks/useRefusalSeo";
import { incrementPageView } from "@/services/refusalSeoEngine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, MapPin, DollarSign, Shield, ArrowRight, Wrench, HelpCircle } from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import InternalLinkBlock from "@/components/navigation/InternalLinkBlock";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const RefusalSeoPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useRefusalSeoPage(slug || "");

  // Track view + inject JSON-LD
  useEffect(() => {
    if (!page) return;
    incrementPageView(page.id);

    if (page.json_ld) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(page.json_ld);
      script.id = "refusal-seo-jsonld";
      document.getElementById("refusal-seo-jsonld")?.remove();
      document.head.appendChild(script);
      return () => { script.remove(); };
    }
  }, [page]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-12 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!page) return <NotFound />;

  const faqs = (page.faq_json || []) as Array<{ question: string; answer: string }>;
  const links = (page.internal_links_json || []) as Array<{ to: string; label: string }>;

  return (
    <MainLayout>
      <SeoHead title={page.meta_title} description={page.meta_description} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-12 md:py-16">
        <div className="container max-w-4xl">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {page.city_name && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" /> {page.city_name}
                </Badge>
              )}
              {page.structure_type && (
                <Badge variant="secondary">{page.structure_type}</Badge>
              )}
              {page.material && (
                <Badge variant="secondary">{page.material}</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">{page.h1}</h1>
          </motion.div>
        </div>
      </section>

      <div className="container max-w-4xl py-8 space-y-10">
        {/* Problem Explanation */}
        {page.problem_explanation && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Comprendre le problème
            </h2>
            <p className="text-muted-foreground leading-relaxed">{page.problem_explanation}</p>
          </motion.section>
        )}

        {/* Why Contractors Refuse */}
        {page.why_contractors_refuse && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-amber-500" /> Pourquoi certains entrepreneurs refusent
                </h2>
                <p className="text-muted-foreground leading-relaxed">{page.why_contractors_refuse}</p>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Correct Solution */}
        {page.correct_solution && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" /> La bonne solution
            </h2>
            <p className="text-muted-foreground leading-relaxed">{page.correct_solution}</p>
          </motion.section>
        )}

        {/* Cost Estimate */}
        {(page.cost_estimate_min || page.cost_estimate_max) && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Estimation des coûts
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {page.cost_estimate_min?.toLocaleString("fr-CA")} $ — {page.cost_estimate_max?.toLocaleString("fr-CA")} $
                  </span>
                  {page.cost_unit && <span className="text-sm text-muted-foreground">{page.cost_unit}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Les coûts varient selon la superficie, les matériaux et la complexité du projet.
                </p>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* CTA */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <SeoCta
            searchUrl="/search"
            cityName={page.city_name || undefined}
          />
        </motion.div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <SeoFaqSection faqs={faqs.map(f => ({ question: f.question, answer: f.answer, topics: [page.problem_slug || "general"] }))} />
          </motion.section>
        )}

        {/* Internal Links */}
        {links.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" /> Ressources connexes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border/30 bg-card/50 hover:bg-accent/10 transition-colors text-sm"
                >
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{link.label}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Growth CTA */}
        <GrowthCtaBlock context="refusal_seo" problemSlug={page.problem_slug || undefined} citySlug={page.city_slug || undefined} />

        {/* Footer SEO maillage */}
        <InternalLinkBlock pageType="problem" slug={page.problem_slug || undefined} city={page.city_slug || undefined} />
      </div>
    </MainLayout>
  );
};

export default RefusalSeoPage;
