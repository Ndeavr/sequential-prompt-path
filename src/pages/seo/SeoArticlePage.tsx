/**
 * UNPRO — SEO Article Page (public)
 * Route: /articles/:slug
 *
 * Premium reading UX: chunked content, progress bar, contextual Alex CTA,
 * estimated reading time, focus mode, sticky key takeaways.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, MapPin, ArrowRight, Clock, BookOpen,
  ChevronDown, Lightbulb,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

/* ── Helpers ── */

/** Estimate reading time from word count or HTML */
function estimateReadingTime(wordCount?: number, html?: string): number {
  if (wordCount && wordCount > 0) return Math.max(1, Math.ceil(wordCount / 250));
  if (!html) return 3;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 250));
}

/** Split HTML into semantic chunks at <h2>, <h3>, <hr> boundaries */
function chunkHtml(html: string): string[] {
  if (!html) return [];
  // Split before headings and hrs
  const parts = html.split(/(?=<h[23][^>]*>)|(?=<hr\s*\/?>)/gi).filter(Boolean);
  // Merge tiny fragments into previous chunk
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

/** Extract key insights (bold sentences) from HTML */
function extractKeyTakeaways(html: string): string[] {
  if (!html) return [];
  const matches = html.match(/<strong>([^<]{20,})<\/strong>/gi) || [];
  return matches
    .map((m) => m.replace(/<\/?strong>/gi, "").trim())
    .filter((t) => t.length > 15 && t.length < 200)
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

  // JSON-LD injection
  useEffect(() => {
    if (!article?.schema_json_ld) return;
    const schemas = Array.isArray(article.schema_json_ld) ? article.schema_json_ld : [article.schema_json_ld];
    const scripts: HTMLScriptElement[] = [];
    schemas.forEach((schema: any, i: number) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `article-jsonld-${i}`;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scripts.push(script);
    });
    return () => scripts.forEach((s) => s.remove());
  }, [article]);

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
  const links = useMemo(
    () => (article?.internal_links || []).map((l: any) => ({ to: l.url, label: l.anchor })),
    [article]
  );

  /** Open Alex with article context */
  const openAlexContextual = useCallback(() => {
    if (!article) return;
    const contextHint = [
      `L'utilisateur lit l'article "${article.title}".`,
      article.category ? `Catégorie: ${article.category}.` : "",
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
          <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title={article.meta_title || article.title}
        description={article.meta_description || ""}
        canonical={`https://unpro.ca/articles/${article.slug}`}
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
        {/* ── Smart Header ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Meta line */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {article.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {article.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(article.created_at).toLocaleDateString("fr-CA")}
            </span>
            <span className="flex items-center gap-1 text-primary/80 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Lecture {readingTime} min
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {article.h1 || article.title}
          </h1>

          {/* Focus mode toggle */}
          <button
            onClick={() => setFocusMode((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-border/50"
          >
            <BookOpen className="h-3 w-3" />
            {focusMode ? "Mode normal" : "Mode lecture"}
          </button>
        </motion.header>

        {/* ── Key Takeaways (if any) ── */}
        {takeaways.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Lightbulb className="h-4 w-4" />
              Points clés
            </div>
            <ul className="space-y-1.5">
              {takeaways.map((t, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* ── Chunked Content ── */}
        {chunks.map((chunk, i) => (
          <motion.section
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * Math.min(i, 6) }}
            className="prose prose-sm md:prose-base max-w-none text-foreground
              prose-headings:text-foreground prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
              prose-p:mb-5 prose-p:leading-[1.8]
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-li:text-muted-foreground
              prose-ul:space-y-2 prose-ul:pl-5 prose-ol:space-y-2 prose-ol:pl-5
              prose-li:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: chunk }}
          />
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

        {/* ── FAQ ── */}
        {faqs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <h2 className="text-xl font-bold text-foreground">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq: any, i: number) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border/30">
                  <AccordionTrigger className="text-sm font-medium text-foreground py-4 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        )}

        {/* ── Internal Links ── */}
        {links.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SeoInternalLinks heading="Articles connexes" links={links} />
          </motion.div>
        )}

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
            className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-xs"
          >
            <button
              onClick={openAlexContextual}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
            >
              Parler à Alex <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
