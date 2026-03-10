/**
 * UNPRO — Guide SEO Page
 * Template for /guides/:topic routes.
 */

import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { getGuideBySlug } from "@/seo/data/guides";
import { getServiceBySlug } from "@/seo/data/services";
import { getProblemBySlug } from "@/seo/data/problems";
import { SEO_CITIES } from "@/seo/data/cities";
import NotFound from "@/pages/NotFound";

const GuidePage = () => {
  const { topic } = useParams<{ topic: string }>();
  const guide = topic ? getGuideBySlug(topic) : undefined;

  if (!guide) return <NotFound />;

  // Build related links
  const serviceLinks = guide.relatedServices
    .map((slug) => {
      const s = getServiceBySlug(slug);
      if (!s) return null;
      const city = SEO_CITIES[0];
      return { to: `/services/${s.slug}/${city.slug}`, label: `${s.name} à ${city.name}` };
    })
    .filter((l): l is { to: string; label: string } => !!l);

  const problemLinks = guide.relatedProblems
    .map((slug) => {
      const p = getProblemBySlug(slug);
      if (!p) return null;
      const city = SEO_CITIES[0];
      return { to: `/problems/${p.slug}/${city.slug}`, label: `${p.name} à ${city.name}` };
    })
    .filter((l): l is { to: string; label: string } => !!l);

  const faqItems = guide.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
    topics: [] as string[],
  }));

  return (
    <MainLayout>
      <SeoHead title={guide.metaTitle} description={guide.metaDescription} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">Accueil</Link>
          <span>/</span>
          <span>Guides</span>
          <span>/</span>
          <span className="text-foreground">{guide.title}</span>
        </nav>

        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{guide.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{guide.intro}</p>
        </header>

        {/* Sections */}
        {guide.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-xl font-bold text-foreground mb-3">{section.heading}</h2>
            <p className="text-muted-foreground leading-relaxed">{section.content}</p>
          </section>
        ))}

        {/* CTA */}
        <SeoCta searchUrl="/search" />

        {/* FAQ */}
        <SeoFaqSection faqs={faqItems} />

        {/* Internal links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SeoInternalLinks heading="Services reliés" links={serviceLinks} />
          <SeoInternalLinks heading="Problèmes reliés" links={problemLinks} />
        </div>
      </article>
    </MainLayout>
  );
};

export default GuidePage;
