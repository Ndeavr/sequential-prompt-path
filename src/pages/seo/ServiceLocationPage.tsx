/**
 * UNPRO — Service Location SEO Page
 * Template for /services/:category/:city routes.
 */

import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { buildServiceLocationPage } from "@/seo/services/seoContentService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, DollarSign, MapPin } from "lucide-react";
import NotFound from "@/pages/NotFound";

const ServiceLocationPage = () => {
  const { category, city } = useParams<{ category: string; city: string }>();
  const data = category && city ? buildServiceLocationPage(category, city) : null;

  if (!data) return <NotFound />;

  return (
    <MainLayout>
      <SeoHead title={data.metaTitle} description={data.metaDescription} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">Accueil</Link>
          <span>/</span>
          <Link to="/search" className="hover:underline">Services</Link>
          <span>/</span>
          <span className="text-foreground">{data.h1}</span>
        </nav>

        {/* H1 */}
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{data.h1}</h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{data.intro}</p>
        </header>

        {/* Why it matters */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Pourquoi c'est important</h2>
          <p className="text-muted-foreground leading-relaxed">{data.whyItMatters}</p>
        </section>

        {/* When to act */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Quand agir
          </h2>
          <ul className="space-y-2">
            {data.whenToAct.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing factors */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ce qui influence le prix
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.pricingFactors.map((factor, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground">{factor}</p>
                </CardContent>
              </Card>
            ))}
          </div>
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
        <SeoCta searchUrl={data.searchUrl} cityName={city} serviceName={data.h1.split(" à ")[0]} />

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
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold text-foreground mb-2">Guides utiles</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" asChild>
              <Link to="/guides/comment-choisir-couvreur">Comment choisir un couvreur</Link>
            </Badge>
            <Badge variant="secondary" asChild>
              <Link to="/guides/verifier-soumission-isolation">Vérifier une soumission</Link>
            </Badge>
            <Badge variant="secondary" asChild>
              <Link to="/guides/signes-probleme-fondation">Problèmes de fondation</Link>
            </Badge>
          </div>
        </div>
      </article>
    </MainLayout>
  );
};

export default ServiceLocationPage;
