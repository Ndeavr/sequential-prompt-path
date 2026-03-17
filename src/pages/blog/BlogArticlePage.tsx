/**
 * UNPRO — Blog Article Page
 * Route: /blog/:slug
 * Full SEO: JSON-LD, FAQ, internal links, gated support
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CalendarDays, Clock, Tag, ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import LikeShareButtons from "@/components/shared/LikeShareButtons";

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  useEngagementTracking();

  const { data: article, isLoading } = useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      return data as any;
    },
    enabled: !!slug,
  });

  // Related articles
  const { data: related } = useQuery({
    queryKey: ["blog-related", article?.category],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("id, title, slug, category, city, reading_time_minutes, featured_image_url")
        .eq("status", "published")
        .eq("category", article.category)
        .neq("slug", slug)
        .limit(3);
      return data as any[] || [];
    },
    enabled: !!article?.category,
  });

  // JSON-LD
  const jsonLd = article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    wordCount: article.word_count,
    url: `https://unpro.ca/blog/${article.slug}`,
    author: { "@type": "Organization", name: "UNPRO" },
    publisher: { "@type": "Organization", name: "UNPRO", logo: { "@type": "ImageObject", url: "https://unpro.ca/logo.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://unpro.ca/blog/${article.slug}` },
  } : null;

  const faqJsonLd = article?.faq_json?.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq_json.map((f: any) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Article introuvable</h1>
          <Link to="/blog" className="text-primary hover:underline">Retour au blog</Link>
        </div>
      </div>
    );
  }

  const faqs = article.faq_json || [];
  const internalLinks = article.internal_linking_json || [];

  return (
    <>
      <Helmet>
        <title>{article.seo_title || article.title} | UNPRO</title>
        <meta name="description" content={article.meta_description || ""} />
        <link rel="canonical" href={`https://unpro.ca/blog/${article.slug}`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.meta_description} />
        <meta property="og:url" content={`https://unpro.ca/blog/${article.slug}`} />
        <meta property="og:type" content="article" />
        {article.featured_image_url && <meta property="og:image" content={article.featured_image_url} />}
        {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
        {faqJsonLd && <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>}
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          {" / "}
          <Link to="/blog" className="hover:text-primary">Blog</Link>
          {" / "}
          <span className="text-foreground">{article.title}</span>
        </nav>

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {article.category && <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{article.category}</span>}
            {article.city && <><span>•</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{article.city}</span></>}
            {article.published_at && <><span>•</span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(article.published_at).toLocaleDateString("fr-CA")}</span></>}
            {article.reading_time_minutes && <><span>•</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{article.reading_time_minutes} min</span></>}
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{article.title}</h1>
            <LikeShareButtons
              entityType="blog_article"
              entityId={article.id}
              variant="inline"
              shareTitle={article.title}
              shareUrl={`https://unpro.ca/blog/${article.slug}`}
            />
          </div>
          {article.subtitle && <p className="text-xl text-muted-foreground">{article.subtitle}</p>}
        </motion.header>

        {/* Featured Image */}
        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={`${article.category} ${article.city || "québec"} entrepreneur vérifié`}
            className="w-full rounded-xl object-cover max-h-96"
            loading="lazy"
          />
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="prose prose-lg max-w-none text-foreground
            prose-headings:text-foreground prose-headings:font-bold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-li:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: article.content_html || "" }}
        />

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Questions fréquentes</h2>
            <div className="space-y-2">
              {faqs.map((faq: any, i: number) => (
                <FaqItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Internal Links */}
        {internalLinks.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">À lire aussi</h2>
            <div className="flex flex-wrap gap-2">
              {internalLinks.map((link: any, i: number) => (
                <Link
                  key={i}
                  to={link.target_url}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:bg-accent hover:text-primary transition"
                >
                  {link.anchor_text} <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Related Articles */}
        {related && related.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h2 className="text-xl font-semibold text-foreground mb-4">Articles connexes</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r: any) => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group rounded-lg border border-border p-4 hover:shadow-md transition">
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2">{r.title}</h3>
                  <span className="text-xs text-muted-foreground mt-1 block">{r.reading_time_minutes || 5} min</span>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground">Besoin d'aide avec ce projet?</h3>
          <p className="text-muted-foreground text-sm">UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/alex"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Obtenir mon rendez-vous <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/alex"
              className="inline-flex items-center gap-2 border border-border px-6 py-2.5 rounded-lg font-medium hover:bg-accent transition text-foreground"
            >
              Parler à Alex
            </Link>
          </div>
        </motion.div>
      </article>
    </>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="font-medium text-foreground text-sm">{question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-muted-foreground">{answer}</div>}
    </div>
  );
}
