import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Flower2, Sun, Leaf, Snowflake } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import CTASection from "@/components/shared/CTASection";
import RelatedLinksSection from "@/components/shared/RelatedLinksSection";
import { SEASONAL_CHECKLISTS } from "@/data/mockMaintenance";
import { useEffect } from "react";
import { injectJsonLd, collectionPageSchema, breadcrumbSchema } from "@/lib/seoSchema";

const SEASON_ICONS: Record<string, any> = { Flower2, Sun, Leaf, Snowflake };
const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-muted-foreground/30",
};

export default function EntretienPreventifPage() {
  useEffect(() => {
    const cleanups = [
      injectJsonLd(collectionPageSchema("Entretien préventif", "Checklists saisonnières pour propriétaires au Québec", "https://unpro.ca/entretien-preventif")),
      injectJsonLd(breadcrumbSchema([{ name: "Accueil", url: "https://unpro.ca" }, { name: "Entretien préventif", url: "https://unpro.ca/entretien-preventif" }])),
    ];
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <>
      <Helmet>
        <title>Entretien préventif — Checklists saisonnières | UNPRO</title>
        <meta name="description" content="Protégez votre maison toute l'année. Checklists d'entretien par saison pour les propriétaires du Québec." />
        <link rel="canonical" href="https://unpro.ca/entretien-preventif" />
      </Helmet>

      <Breadcrumbs items={[{ label: "Entretien préventif" }]} />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-12">
        <PageHero
          title="Entretien préventif"
          subtitle="Un entretien régulier coûte 10x moins cher qu'une réparation d'urgence. Suivez nos checklists saisonnières."
          compact
        />

        {SEASONAL_CHECKLISTS.map((season, si) => {
          const IconComp = SEASON_ICONS[season.icon] || Leaf;
          return (
            <motion.section
              key={season.seasonSlug}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IconComp className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground font-display">{season.season}</h2>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {season.items.map((item, i) => (
                  <Card key={i} className={`border-l-4 ${PRIORITY_COLORS[item.priority]}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>
          );
        })}

        <CTASection
          title="Besoin d'un professionnel pour l'entretien?"
          description="Un entrepreneur vérifié peut effectuer l'inspection et l'entretien de votre maison."
          primaryCta={{ label: "Trouver un entrepreneur", to: "/trouver-un-entrepreneur" }}
          secondaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          variant="accent"
        />

        <RelatedLinksSection links={[
          { to: "/problemes-maison", label: "Problèmes maison" },
          { to: "/blog/conseils-entretien", label: "Conseils entretien" },
          { to: "/villes-desservies", label: "Villes desservies" },
        ]} />
      </div>
    </>
  );
}
