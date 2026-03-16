/**
 * UNPRO — Renovation + Location SEO Page
 * Route: /renovation/:projectSlug/:citySlug
 * Programmatic page combining renovation inspiration, budget, design tips, and contractor CTA.
 */

import { useParams, Link } from "react-router-dom";
import { slugToDisplayName } from "@/lib/displayFormatters";
import { useMemo, useEffect } from "react";
import { buildRenovationPage } from "@/seo/services/renovationContentService";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import SeoCta from "@/seo/components/SeoCta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Paintbrush,
  DollarSign,
  Lightbulb,
  MapPin,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Crown,
  Search,
} from "lucide-react";

const RenovationLocationPage = () => {
  const { projectSlug, citySlug } = useParams<{
    projectSlug: string;
    citySlug: string;
  }>();

  const data = useMemo(
    () =>
      projectSlug && citySlug
        ? buildRenovationPage(projectSlug, citySlug)
        : null,
    [projectSlug, citySlug]
  );

  // JSON-LD injection
  useEffect(() => {
    if (!data) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data.jsonLd);
    script.id = "seo-renovation-jsonld";
    const existing = document.getElementById("seo-renovation-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            Page non trouvée
          </h1>
          <p className="text-muted-foreground">
            Ce projet de rénovation ou cette ville n'existe pas.
          </p>
          <Button asChild>
            <Link to="/services">Voir tous les services</Link>
          </Button>
        </div>
      </div>
    );
  }

  const budgetTiers = [
    {
      label: "Cosmétique",
      icon: Sparkles,
      ...data.budgetTiers.cosmetic,
      description: "Rafraîchissement visuel — peinture, accessoires, petits ajustements",
      color: "text-accent",
    },
    {
      label: "Équilibré",
      icon: TrendingUp,
      ...data.budgetTiers.balanced,
      description: "Transformation significative — nouveaux matériaux et équipements",
      color: "text-primary",
    },
    {
      label: "Premium",
      icon: Crown,
      ...data.budgetTiers.premium,
      description: "Rénovation complète haut de gamme — matériaux et finitions de luxe",
      color: "text-secondary",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={data.metaTitle}
        description={data.metaDescription}
        canonical={`https://unpro.ca/renovation/${projectSlug}/${citySlug}`}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* ─── Header ─── */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/services" className="hover:text-primary transition-colors">
              Services
            </Link>
            <span>/</span>
            <span>{data.categoryLabel}</span>
            <span>/</span>
            <span className="text-foreground font-medium">{slugToDisplayName(citySlug || "")}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-display leading-tight">
            {data.h1}
          </h1>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {citySlug && data.nearbyCityPages.length > 0
                ? `${data.nearbyCityPages.length + 1} villes couvertes`
                : "Service local"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Paintbrush className="h-3 w-3" />
              {data.categoryLabel}
            </Badge>
          </div>
        </header>

        {/* ─── Section 1: Description / Intro ─── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Comprendre le projet
          </h2>
          <p className="text-muted-foreground leading-relaxed">{data.intro}</p>
        </section>

        <Separator />

        {/* ─── Section 2: Budget Estimates ─── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Estimation de budget
          </h2>
          <p className="text-muted-foreground text-sm">
            Estimations pour un projet typique dans la région. Les coûts varient
            selon la taille, les matériaux et la complexité.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {budgetTiers.map((tier) => (
              <Card key={tier.label} className="border bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <tier.icon className={`h-5 w-5 ${tier.color}`} />
                    <h3 className="font-semibold text-foreground">
                      {tier.label}
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {tier.low.toLocaleString("fr-CA")} $ –{" "}
                    {tier.high.toLocaleString("fr-CA")} $
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ─── Section 3: Design Tips ─── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            Conseils design
          </h2>
          <ul className="space-y-3">
            {data.designTips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-muted-foreground"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* ─── Section 4: Local Context ─── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Contexte local
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {data.localContext}
          </p>
        </section>

        <Separator />

        {/* ─── Section 5: FAQ ─── */}
        <SeoFaqSection faqs={data.faqs} heading="Questions fréquentes" />

        <Separator />

        {/* ─── Section 6: CTA — Find Contractors ─── */}
        <section className="rounded-xl border bg-card p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Trouvez un entrepreneur pour votre projet
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            UNPRO vous aide à trouver des entrepreneurs vérifiés spécialisés en{" "}
            {data.categoryLabel.toLowerCase()} dans votre région. Comparez les
            soumissions, vérifiez les licences et choisissez le meilleur
            professionnel.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link to={data.searchUrl}>
                <Search className="mr-2 h-4 w-4" />
                Trouver un entrepreneur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/alex/renovation">
                <Sparkles className="mr-2 h-4 w-4" />
                Visualiser ma rénovation avec Alex
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        {/* ─── Internal Links ─── */}
        <div className="grid gap-6 md:grid-cols-2">
          <SeoInternalLinks
            heading="Projets similaires"
            links={data.relatedRenovationPages.map((r) => ({
              to: `/renovation/${r.slug}/${r.citySlug}`,
              label: r.label,
            }))}
          />
          <SeoInternalLinks
            heading="Villes à proximité"
            links={data.nearbyCityPages.map((c) => ({
              to: `/renovation/${c.renovationSlug}/${c.slug}`,
              label: c.label,
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default RenovationLocationPage;
