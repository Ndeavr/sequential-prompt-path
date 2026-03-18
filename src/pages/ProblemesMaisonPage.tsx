import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Thermometer, Landmark, Droplets, Zap, Square, Flame, Wind, CloudRain, TreePine, AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import CTASection from "@/components/shared/CTASection";
import RelatedLinksSection from "@/components/shared/RelatedLinksSection";
import { MOCK_PROBLEM_CATEGORIES } from "@/data/mockProblems";
import { injectJsonLd, collectionPageSchema, breadcrumbSchema } from "@/lib/seoSchema";
import { useEffect } from "react";

const ICON_MAP: Record<string, any> = { Home, Thermometer, Landmark, Droplets, Zap, Square, Flame, Wind, CloudRain, TreePine };

export default function ProblemesMaisonPage() {
  useEffect(() => {
    const cleanups = [
      injectJsonLd(collectionPageSchema("Problèmes maison", "Guide des problèmes résidentiels au Québec", "https://unpro.ca/problemes-maison")),
      injectJsonLd(breadcrumbSchema([{ name: "Accueil", url: "https://unpro.ca" }, { name: "Problèmes maison", url: "https://unpro.ca/problemes-maison" }])),
    ];
    return () => cleanups.forEach((c) => c());
  }, []);

  const urgentProblems = MOCK_PROBLEM_CATEGORIES.flatMap((c) => c.items.filter((i) => i.urgency === "critical").map((i) => ({ ...i, category: c.name })));

  return (
    <>
      <Helmet>
        <title>Problèmes maison — Guide complet | UNPRO</title>
        <meta name="description" content="Identifiez et comprenez les problèmes de votre maison. Toiture, fondation, isolation, plomberie — diagnostic rapide et solutions pour les propriétaires du Québec." />
        <link rel="canonical" href="https://unpro.ca/problemes-maison" />
        <meta property="og:title" content="Problèmes maison — Guide complet | UNPRO" />
        <meta property="og:description" content="Identifiez et comprenez les problèmes de votre maison." />
      </Helmet>

      <Breadcrumbs items={[{ label: "Problèmes maison" }]} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-12">
        <PageHero
          title="Problèmes maison"
          subtitle="Identifiez rapidement votre problème et trouvez la bonne solution. Guide complet pour les propriétaires du Québec."
          compact
        />

        {/* Category grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MOCK_PROBLEM_CATEGORIES.map((cat, i) => {
            const IconComp = ICON_MAP[cat.icon] || Home;
            return (
              <motion.div key={cat.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/probleme/${cat.slug}`}>
                  <Card className="hover:shadow-lg hover:border-primary/30 transition-all group h-full">
                    <CardContent className="p-5 space-y-2 text-center">
                      <IconComp className="h-8 w-8 text-primary mx-auto" />
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                      <span className="text-xs text-muted-foreground">{cat.issueCount} problèmes</span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Urgent problems */}
        {urgentProblems.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Problèmes urgents
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {urgentProblems.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">({p.category})</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Critique</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular issues */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground font-display">Problèmes populaires</h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_PROBLEM_CATEGORIES.flatMap((c) => c.items.slice(0, 2).map((item) => (
              <Link key={`${c.slug}-${item.title}`} to={`/probleme/${c.slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item.title}</span>
              </Link>
            ))).slice(0, 12)}
          </div>
        </section>

        <CTASection
          title="Besoin d'aide avec un problème?"
          description="Décrivez votre situation et trouvez un professionnel qualifié rapidement."
          primaryCta={{ label: "Décrire mon problème", to: "/decrire-mon-projet" }}
          secondaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          variant="accent"
        />

        <RelatedLinksSection links={[
          { to: "/trouver-un-entrepreneur", label: "Trouver un entrepreneur" },
          { to: "/villes-desservies", label: "Villes desservies" },
          { to: "/entretien-preventif", label: "Entretien préventif" },
          { to: "/blog", label: "Blog" },
        ]} />
      </div>
    </>
  );
}
