/**
 * UNPRO — Problem Location SEO Page
 * Template for /problems/:problem/:city routes.
 */

import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildProblemLocationPage } from "@/seo/services/seoContentService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Eye, ShieldAlert, CheckCircle, MapPin } from "lucide-react";
import NotFound from "@/pages/NotFound";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";

const urgencyColor: Record<string, string> = {
  Faible: "bg-secondary text-secondary-foreground",
  Moyenne: "bg-accent text-accent-foreground",
  Élevée: "bg-destructive/10 text-destructive",
  Critique: "bg-destructive text-destructive-foreground",
};

const ProblemLocationPage = () => {
  const { problem, city } = useParams<{ problem: string; city: string }>();
  const data = problem && city ? buildProblemLocationPage(problem, city) : null;

  if (!data) return <NotFound />;

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">Accueil</Link>
          <span>/</span>
          <span className="text-foreground">{data.h1}</span>
        </nav>

        {/* H1 + urgency */}
        <header className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{data.h1}</h1>
            <Badge className={urgencyColor[data.urgency] ?? ""}>
              Urgence : {data.urgency}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">{data.intro}</p>
        </header>

        {/* Symptoms */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Symptômes à surveiller
          </h2>
          <ul className="space-y-2">
            {data.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Causes */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Causes fréquentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.commonCauses.map((c, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground">{c}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Risks */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Risques si non traité
          </h2>
          <ul className="space-y-2">
            {data.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-destructive font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What to check */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Ce que vous pouvez vérifier</h2>
          <ul className="space-y-2">
            {data.whatToCheck.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Local context */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Contexte local
          </h2>
          <p className="text-muted-foreground leading-relaxed">{data.localContext}</p>
        </section>

        {/* CTA */}
        <SeoCta searchUrl={data.searchUrl} cityName={city} />

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
      </article>
    </MainLayout>
  );
};

export default ProblemLocationPage;
