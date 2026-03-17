/**
 * UNPRO — Dynamic Local SEO Problem Page
 * Route: /services/:city/:slug
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
  AlertTriangle, CheckCircle2, DollarSign, Clock, Wrench,
  ArrowRight, MessageCircle, Camera, Phone, ChevronRight,
  ThermometerSun, Shield, Star,
} from "lucide-react";

const URGENCY_MAP: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  high: { label: "Urgence élevée", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  medium: { label: "À traiter bientôt", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  low: { label: "Préventif", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

export default function LocalSeoPage() {
  const { city, slug } = useParams<{ city: string; slug: string }>();
  const fullSlug = slug || "";

  const { data: page, isLoading } = useQuery({
    queryKey: ["seo-local-page", fullSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_local_pages")
        .select("*")
        .eq("slug", fullSlug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!fullSlug,
  });

  const { data: relatedPages = [] } = useQuery({
    queryKey: ["seo-related", fullSlug],
    queryFn: async () => {
      const slugs = (page?.related_slugs as string[]) || [];
      if (!slugs.length) return [];
      const { data } = await supabase
        .from("seo_local_pages")
        .select("slug, h1, city, urgency, service_category")
        .in("slug", slugs)
        .eq("published", true);
      return data || [];
    },
    enabled: !!page?.related_slugs,
  });

  const { data: internalLinks = [] } = useQuery({
    queryKey: ["seo-internal-links", fullSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_local_links")
        .select("to_slug, anchor_text")
        .eq("from_slug", fullSlug);
      return data || [];
    },
    enabled: !!fullSlug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
          <Button asChild><Link to={`/services/${city}`}>Retour aux services</Link></Button>
        </div>
      </div>
    );
  }

  const urgency = URGENCY_MAP[page.urgency || "medium"] || URGENCY_MAP.medium;
  const UrgencyIcon = urgency.icon;
  const faq = (page.faq as Array<{ q: string; a: string }>) || [];
  const cityLower = (page.city || "").toLowerCase();

  return (
    <>
      <Helmet>
        <title>{page.meta_title || page.h1 || page.problem}</title>
        <meta name="description" content={page.meta_description || page.intro || ""} />
        <link rel="canonical" href={`/services/${cityLower}/${page.slug}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-primary/5 to-background px-4 py-10 md:py-16"
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
              <Link to="/" className="hover:text-foreground">Accueil</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/services/${cityLower}`} className="hover:text-foreground">{page.city}</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{page.service_category}</span>
            </nav>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={urgency.color}>
                <UrgencyIcon className="h-3 w-3 mr-1" />{urgency.label}
              </Badge>
              {page.service_category && (
                <Badge variant="secondary">{page.service_category}</Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {page.h1}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {page.intro}
            </p>

            {/* Scores */}
            <div className="flex gap-4 flex-wrap">
              {[
                { label: "SEO", value: page.seo_score },
                { label: "Intent", value: page.intent_score },
                { label: "Conversion", value: page.conversion_score },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3" />
                  <span>{s.label}: <strong className="text-foreground">{s.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="max-w-4xl mx-auto px-4 pb-32 space-y-8">
          {/* Diagnostic */}
          {page.diagnostic && (
            <Section icon={<ThermometerSun className="h-5 w-5 text-primary" />} title="Diagnostic rapide">
              <p className="text-muted-foreground leading-relaxed">{page.diagnostic}</p>
            </Section>
          )}

          {/* Causes */}
          {page.causes && (
            <Section icon={<AlertTriangle className="h-5 w-5 text-amber-400" />} title={`Pourquoi ça arrive à ${page.city}`}>
              <p className="text-muted-foreground leading-relaxed">{page.causes}</p>
            </Section>
          )}

          {/* Solution */}
          {page.solution && (
            <Section icon={<Wrench className="h-5 w-5 text-emerald-400" />} title="Solution recommandée">
              <p className="text-muted-foreground leading-relaxed">{page.solution}</p>
            </Section>
          )}

          {/* Cost */}
          {page.cost_range && (
            <Section icon={<DollarSign className="h-5 w-5 text-primary" />} title={`Coût estimatif à ${page.city}`}>
              <p className="text-2xl font-bold text-foreground">{page.cost_range}</p>
              <p className="text-sm text-muted-foreground mt-1">Estimation basée sur les réalités du marché québécois.</p>
            </Section>
          )}

          {/* Timing */}
          {page.timing && (
            <Section icon={<Clock className="h-5 w-5 text-blue-400" />} title="Quand agir">
              <p className="text-muted-foreground leading-relaxed">{page.timing}</p>
            </Section>
          )}

          {/* Contractor CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Entrepreneur compatible</h3>
              </div>
              <p className="text-muted-foreground">
                On cherche un pro compatible pour vous à {page.city}. Décrivez votre problème et Alex vous aide.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link to="/alex">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Parler à Alex
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/decrire-projet">
                    <Camera className="mr-2 h-4 w-4" />
                    Ajouter des photos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Questions fréquentes</h2>
              <div className="space-y-3">
                {faq.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                      <p className="text-sm text-muted-foreground">{item.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Related Pages */}
          {relatedPages.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Pages reliées</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedPages.map(rp => (
                  <Link
                    key={rp.slug}
                    to={`/services/${(rp.city || "").toLowerCase()}/${rp.slug}`}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{rp.h1}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky CTA Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3 flex gap-3 justify-center z-50 md:hidden">
          <Button size="sm" className="flex-1 max-w-[200px]" asChild>
            <Link to="/alex">
              <MessageCircle className="mr-2 h-4 w-4" />
              Urgence — parler à Alex
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1 max-w-[200px]" asChild>
            <Link to="/decrire-projet">
              Demander une estimation
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
