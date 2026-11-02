/**
 * UNPRO — Blog Index Page
 * Route: /blog
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CalendarDays, Clock, ArrowRight, Tag } from "lucide-react";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import PriorityTopicLinks from "@/seo/components/PriorityTopicLinks";
import { useLanguage } from "@/components/ui/LanguageToggle";
import BlogImage, { blogImageAlt } from "@/components/blog/BlogImage";


const CATEGORIES: { key: string; fr: string; en: string }[] = [
  { key: "all", fr: "Tous", en: "All" },
  { key: "passeport-maison", fr: "Passeport Maison", en: "Home Passport" },
  { key: "toiture", fr: "Toiture", en: "Roofing" },
  { key: "isolation", fr: "Isolation", en: "Insulation" },
  { key: "renovation", fr: "Rénovation", en: "Renovation" },
  { key: "urgence", fr: "Urgences", en: "Emergencies" },
  { key: "condo", fr: "Condo / Loi 16", en: "Condo / Bill 16" },
  { key: "cout", fr: "Guides de coûts", en: "Cost guides" },
  { key: "entrepreneur", fr: "Choix entrepreneur", en: "Choosing a contractor" },
  { key: "comparaison", fr: "Comparaisons", en: "Comparisons" },
];

const T = {
  fr: { h1: "Conseils d'experts pour vos projets", sub: "Guides pratiques, erreurs à éviter et astuces de pros, par UNPRO.", empty: "Aucun article dans cette langue pour le moment.", error: "Impossible de charger les articles.", retry: "Réessayer", cta: "Besoin d'aide pour votre projet?", ctaSub: "Clara vous aide à clarifier votre besoin et à trouver le professionnel le plus compatible.", ctaBtn: "Parler à Clara", how: "Comment ça fonctionne", lang: "Langue des articles" },
  en: { h1: "Expert advice for your home projects", sub: "Practical guides, mistakes to avoid and pro tips, by UNPRO.", empty: "No articles in this language yet.", error: "Unable to load articles.", retry: "Retry", cta: "Need help with your project?", ctaSub: "Clara helps you clarify your need and find the most compatible professional.", ctaBtn: "Talk to Clara", how: "How it works", lang: "Article language" },
};

export default function BlogIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "all";
  useEngagementTracking();
  const alexVoice = useAlexVoice();
  const { lang, setLang } = useLanguage();
  const t = T[lang];

  const { data: articles, isLoading, isError, refetch } = useQuery({
    queryKey: ["blog-articles", lang, category],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles")
        .select("id, title, subtitle, slug, category, city, audience_type, meta_description, published_at, reading_time_minutes, word_count, featured_image_url, tags")
        .eq("status", "published")
        .eq("audience_type", "public")
        .eq("language", lang);

      if (category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query.order("published_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog UNPRO — Conseils rénovation et entrepreneurs",
    description: "Conseils experts pour propriétaires québécois : rénovation, entrepreneurs vérifiés, rendez-vous garantis.",
    url: "https://unpro.ca/blog",
    publisher: { "@type": "Organization", name: "UNPRO" },
  };

  return (
    <>
      <Helmet>
        <title>Blog UNPRO — Conseils rénovation et entrepreneurs vérifiés | Québec</title>
        <meta name="description" content="Conseils experts pour propriétaires : toiture, isolation, rénovation, choix d'entrepreneur. Rendez-vous garantis avec des professionnels vérifiés." />
        <link rel="canonical" href="https://unpro.ca/blog" />
        <meta property="og:title" content="Blog UNPRO — Conseils rénovation Québec" />
        <meta property="og:description" content="Conseils experts pour vos projets de rénovation au Québec." />
        <meta property="og:url" content="https://unpro.ca/blog" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">{t.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.sub}</p>
          <div role="group" aria-label={t.lang} className="inline-flex rounded-full border border-border p-1">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                className={`min-h-11 px-4 rounded-full text-sm font-medium ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {l === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSearchParams(cat.key === "all" ? {} : { category: cat.key })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                category === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cat[lang]}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-muted h-72" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles?.map((article, i) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/blog/${article.slug}`}
                  className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition"
                >
                  <BlogImage src={article.featured_image_url} alt={blogImageAlt(article, lang)} priority={i === 0} />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {article.category && (
                        <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{article.category}</span>
                      )}
                      {article.city && <span>• {article.city}</span>}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.meta_description || article.subtitle}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{article.reading_time_minutes || 5} min
                      </span>
                      {article.published_at && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", { year: "numeric", month: "long", day: "numeric" })}</time>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <p>{t.error}</p>
            <button onClick={() => refetch()} className="min-h-11 px-5 rounded-lg border border-border">{t.retry}</button>
          </div>
        )}
        {!isError && articles && articles.length === 0 && (
          <div className="text-center py-16 text-muted-foreground"><p>{t.empty}</p></div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 rounded-xl bg-primary/5 border border-primary/20 p-8 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground">{t.cta}</h2>
          <p className="text-muted-foreground">{t.ctaSub}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => alexVoice.openAlex("general")} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition">
              {t.ctaBtn} <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/comment-ca-marche" className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-accent transition text-foreground">
              {t.how}
            </Link>
          </div>
        </motion.div>
      </div>

      <PriorityTopicLinks />
    </>

  );
}
