/**
 * UNPRO — SEO Article Page (public)
 * Route: /articles/:slug
 *
 * Premium reading UX with SEO optimization: structured data, clean highlights,
 * readable paragraphs, FAQ with JSON-LD, internal links, contextual Alex CTA.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, MapPin, ArrowRight, Clock, BookOpen,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import BarArticleEngagementActions from "@/components/articles/BarArticleEngagementActions";
import BlockArticleParagraphReadable from "@/components/articles/BlockArticleParagraphReadable";
import PanelArticleHighlightsClean from "@/components/articles/PanelArticleHighlightsClean";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";

/* ── Helpers ── */

function estimateReadingTime(wordCount?: number, html?: string): number {
  if (wordCount && wordCount > 0) return Math.max(1, Math.ceil(wordCount / 250));
  if (!html) return 3;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 250));
}

/** Split HTML into semantic chunks at <h2>, <h3>, <hr> boundaries */
function chunkHtml(html: string): string[] {
  if (!html) return [];
  const parts = html.split(/(?=<h[23][^>]*>)|(?=<hr\s*\/?>)/gi).filter(Boolean);
  const merged: string[] = [];
  for (const part of parts) {
    const stripped = part.replace(/<[^>]*>/g, "").trim();
    if (stripped.length < 30 && merged.length > 0) {
      merged[merged.length - 1] += part;
    } else {
      merged.push(part);
    }
  }
  return merged.length > 0 ? merged : [html];
}

/** Extract key insights (bold sentences) from HTML, deduplicating */
function extractKeyTakeaways(html: string): string[] {
  if (!html) return [];
  const matches = html.match(/<strong>([^<]{20,})<\/strong>/gi) || [];
  const seen = new Set<string>();
  return matches
    .map((m) => m.replace(/<\/?strong>/gi, "").trim())
    .filter((t) => {
      if (t.length < 15 || t.length > 200) return false;
      const norm = t.toLowerCase();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    })
    .slice(0, 5);
}

/* ── Component ── */

export default function SeoArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const alexVoice = useAlexVoice();
  const articleRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["seo-article", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!slug,
  });

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      const rect = articleRef.current.getBoundingClientRect();
      const total = articleRef.current.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      setScrollProgress(pct);
      setShowStickyCta(pct > 30 && pct < 95);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Derived data
  const readingTime = useMemo(
    () => article ? estimateReadingTime(article.word_count, article.content_html) : 0,
    [article]
  );
  const chunks = useMemo(() => chunkHtml(article?.content_html || ""), [article]);
  const takeaways = useMemo(() => extractKeyTakeaways(article?.content_html || ""), [article]);
  const faqs = useMemo(
    () => (article?.faq || []).map((f: any) => ({ question: f.question || f.q, answer: f.answer || f.a })),
    [article]
  );
  const internalLinks = useMemo(
    () => (article?.internal_links || []).map((l: any) => ({ url: l.url, anchor: l.anchor })),
    [article]
  );

  /** Open Alex with article context */
  const openAlexContextual = useCallback(() => {
    if (!article) return;
    const contextHint = [
      `L'utilisateur lit l'article "${article.title}".`,
      article.service_category ? `Catégorie: ${article.service_category}.` : "",
      article.city ? `Ville: ${article.city}.` : "",
      `Sujet principal: ${article.h1 || article.title}.`,
      takeaways.length > 0 ? `Points clés: ${takeaways.slice(0, 3).join("; ")}.` : "",
      "Aide-le avec son problème en lien avec cet article.",
    ].filter(Boolean).join(" ");
    alexVoice.openAlex("article_context", contextHint);
  }, [article, alexVoice, takeaways]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Article introuvable</h1>
          <Link to="/articles" className="text-primary hover:underline">Voir tous les articles</Link>
        </div>
      </div>
    );
  }

  // AEO intro: first 2 sentences of meta_description as direct answer
  const aeoIntro = article.meta_description || "";

  return (
    <>
      <SeoHead
        title={article.meta_title || article.title}
        description={article.meta_description || ""}
        canonical={`https://unpro.ca/articles/${article.slug}`}
        ogType="article"
      />

      {/* Structured Data (Article + Breadcrumb JSON-LD) */}
      <SectionArticleStructuredData
        title={article.meta_title || article.title}
        description={article.meta_description || ""}
        slug={article.slug}
        datePublished={article.created_at}
        dateModified={article.updated_at || article.created_at}
        wordCount={article.word_count}
        category={article.service_category}
        city={article.city}
        h1={article.h1}
      />

      {/* ── Reading Progress Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-muted/30">
        <motion.div
          className="h-full bg-primary"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      <article
        ref={articleRef}
        className={`max-w-2xl mx-auto px-4 pt-14 pb-32 space-y-8 transition-all duration-300 ${
          focusMode ? "text-lg leading-relaxed" : ""
        }`}
      >
        {/* ── Breadcrumb (visible + semantic) ── */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li><Link to="/" className="hover:text-primary transition">Accueil</Link></li>
            <li>/</li>
            <li><Link to="/articles" className="hover:text-primary transition">Articles</Link></li>
            <li>/</li>
            <li className="text-foreground/60 truncate max-w-[200px]">{article.title}</li>
          </ol>
        </nav>

        {/* ── Smart Header ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Category + Meta line — author appears ONLY here */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {article.service_category && (
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium text-xs">
                {article.service_category}
              </span>
            )}
            {article.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {article.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(article.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1 text-primary/80 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {readingTime} min de lecture
            </span>
          </div>

          {/* H1 — SEO optimized */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {article.h1 || article.title}
          </h1>

          {/* AEO intro — direct answer for AI engines */}
          {aeoIntro && (
            <p className="text-base text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-4">
              {aeoIntro}
            </p>
          )}

          {/* Controls row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFocusMode((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-border/50"
            >
              <BookOpen className="h-3 w-3" />
              {focusMode ? "Mode normal" : "Mode lecture"}
            </button>
            <BarArticleEngagementActions articleId={article.id} slug={article.slug} title={article.title} />
          </div>
        </motion.header>

        {/* ── Key Takeaways (deduplicated, no author) ── */}
        <PanelArticleHighlightsClean takeaways={takeaways} authorName="UNPRO" />

        {/* ── Chunked Content with readable blocks ── */}
        {chunks.map((chunk, i) => (
          <motion.section
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * Math.min(i, 6) }}
          >
            <BlockArticleParagraphReadable html={chunk} />
          </motion.section>
        ))}

        {/* ── Inline CTA (mid-article) ── */}
        {chunks.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-center gap-3"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Ce problème vous concerne?</p>
              <p className="text-xs text-muted-foreground">Alex peut vous aider à trouver une solution adaptée.</p>
            </div>
            <button
              onClick={openAlexContextual}
              className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
            >
              Alex <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* ── FAQ with JSON-LD ── */}
        <SectionArticleFAQSEO faqs={faqs} />

        {/* ── Internal Links ── */}
        <SectionArticleInternalLinksSEO links={internalLinks} />

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground">Besoin d'aide avec ce problème?</h3>
          <p className="text-muted-foreground text-sm">
            Alex connaît déjà le sujet de cet article. Décrivez votre situation et trouvez un professionnel vérifié.
          </p>
          <button
            onClick={openAlexContextual}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Parler à Alex <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </article>

      {/* ── Sticky Mobile CTA ── */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm"
          >
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 shadow-lg">
              <BarArticleEngagementActions articleId={article.id} slug={article.slug} title={article.title} compact />
              <div className="flex-1" />
              <button
                onClick={openAlexContextual}
                className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
              >
                Alex <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
