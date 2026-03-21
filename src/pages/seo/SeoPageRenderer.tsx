/**
 * UNPRO — Dynamic SEO Page Renderer
 * Renders any seo_pages entry with full SEO: H1, intro, body, FAQ accordion, CTA, JSON-LD, internal links.
 * Route: /s/:slug
 */
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, ChevronRight, HelpCircle, MapPin, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";

interface FaqItem {
  question: string;
  answer: string;
}

export default function SeoPageRenderer() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ["seo-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Track view
  useQuery({
    queryKey: ["seo-page-view", page?.id],
    queryFn: async () => {
      if (page?.id) {
        await supabase
          .from("seo_pages")
          .update({ views: (page.views || 0) + 1 })
          .eq("id", page.id);
      }
      return null;
    },
    enabled: !!page?.id,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-5 py-12 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!page) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-5 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Page non trouvée</h1>
          <p className="text-muted-foreground mb-6">Cette page n'existe pas ou n'est pas encore publiée.</p>
          <Button asChild><Link to="/services">Explorer les services</Link></Button>
        </div>
      </MainLayout>
    );
  }

  const faqItems: FaqItem[] = (page.faq_json as unknown as FaqItem[]) || [];
  const internalLinks: string[] = (page.internal_links as unknown as string[]) || [];
  const schemaJson = page.schema_json;

  // Build JSON-LD script content
  const jsonLdContent = Array.isArray(schemaJson)
    ? schemaJson.map((s: any) => JSON.stringify(s))
    : schemaJson && typeof schemaJson === "object" && Object.keys(schemaJson).length > 0
    ? [JSON.stringify(schemaJson)]
    : [];

  return (
    <MainLayout>
      <Helmet>
        <title>{page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        <link rel="canonical" href={`https://unpro.ca/s/${page.slug}`} />
        <meta property="og:title" content={page.title} />
        {page.meta_description && <meta property="og:description" content={page.meta_description} />}
        <meta property="og:url" content={`https://unpro.ca/s/${page.slug}`} />
        <meta property="og:type" content="article" />
        {jsonLdContent.map((ld, i) => (
          <script key={i} type="application/ld+json">{ld}</script>
        ))}
      </Helmet>

      <article className="max-w-4xl mx-auto px-5 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-3 w-3" />
          {page.page_type === "profession_city" && (
            <>
              <Link to="/services" className="hover:text-foreground">Services</Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          {page.page_type === "problem_city" && (
            <>
              <Link to="/problemes-maison" className="hover:text-foreground">Problèmes</Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          {page.city && (
            <>
              <Link to={`/villes/${page.city.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-foreground">{page.city}</Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-foreground truncate max-w-[200px]">{page.h1 || page.title}</span>
        </nav>

        {/* H1 + Badges */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            {page.h1 || page.title}
          </h1>
          <div className="flex flex-wrap gap-2 mb-8">
            {page.city && (
              <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{page.city}</Badge>
            )}
            {page.profession && (
              <Badge variant="outline"><Wrench className="h-3 w-3 mr-1" />{page.profession}</Badge>
            )}
            {page.page_type && (
              <Badge variant="secondary">{page.page_type.replace(/_/g, " ")}</Badge>
            )}
          </div>
        </motion.div>

        {/* Body */}
        {page.body_md && (
          <div className="prose prose-sm md:prose-base max-w-none text-foreground mb-12 prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
            <ReactMarkdown>{page.body_md}</ReactMarkdown>
          </div>
        )}

        {/* CTA mid-page */}
        <Card className="mb-12 border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {page.profession
                ? `Besoin d'un ${page.profession.toLowerCase()}${page.city ? ` à ${page.city}` : ""}?`
                : "Besoin d'aide pour votre projet?"
              }
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Décrivez votre situation et recevez des profils vérifiés en quelques secondes.
            </p>
            <Button asChild>
              <Link to="/alex">Parler à Alex <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* FAQ Accordion */}
        {faqItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-semibold text-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* Internal Links */}
        {internalLinks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-foreground mb-4">Pages connexes</h2>
            <div className="flex flex-wrap gap-2">
              {internalLinks.map((link) => (
                <Button key={link} asChild variant="outline" size="sm">
                  <Link to={link}>
                    {link.replace(/^\/s\//, "").replace(/-/g, " ").replace(/^\//g, "").trim()}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Contractor CTA */}
        <ContractorLandingCta />
      </article>
    </MainLayout>
  );
}
