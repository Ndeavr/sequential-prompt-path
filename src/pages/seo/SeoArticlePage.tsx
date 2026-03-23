/**
 * UNPRO — SEO Article Page (public)
 * Route: /articles/:slug
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function SeoArticlePage() {
  const { slug } = useParams<{ slug: string }>();

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

  // Inject JSON-LD
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
          <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const faqs = (article.faq || []).map((f: any) => ({ question: f.question || f.q, answer: f.answer || f.a }));
  const links = (article.internal_links || []).map((l: any) => ({ to: l.url, label: l.anchor }));

  return (
    <>
      <SeoHead
        title={article.meta_title || article.title}
        description={article.meta_description || ""}
        canonical={`https://unpro.ca/articles/${article.slug}`}
      />

      <article className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{article.city}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(article.created_at).toLocaleDateString("fr-CA")}</span>
            {article.word_count > 0 && <><span>•</span><span>{article.word_count} mots</span></>}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{article.h1 || article.title}</h1>
        </motion.header>

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

        {/* FAQ */}
        {faqs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SeoFaqSection faqs={faqs} heading="Questions fréquentes" />
          </motion.div>
        )}

        {/* Internal Links */}
        {links.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SeoInternalLinks heading="Articles connexes" links={links} />
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground">Besoin d'aide avec ce problème?</h3>
          <p className="text-muted-foreground text-sm">Décrivez votre situation à Alex, notre assistant IA, et trouvez un professionnel vérifié.</p>
          <button
            onClick={() => alexVoice.openAlex("general")}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Parler à Alex <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </article>
    </>
  );
}
