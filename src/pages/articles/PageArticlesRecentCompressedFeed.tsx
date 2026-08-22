/**
 * UNPRO — /articles
 * Compressed feed of recent published articles.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import HeroArticleFeatured from "@/components/articles/HeroArticleFeatured";
import CardArticleCompressed from "@/components/articles/CardArticleCompressed";
import SkeletonArticleCard from "@/components/articles/SkeletonArticleCard";
import { motion } from "framer-motion";
import { RefreshCw, FileText } from "lucide-react";

/** Analyses éditoriales UNPRO (pages statiques, hors table seo_articles) */
const EDITORIALS = [
  {
    slug: "comment-apparaitre-resultats-recherche-ia-2026-entrepreneur",
    title: "Comment apparaître dans les résultats de recherche par l'IA en 2026? Le guide pour les entrepreneurs",
    excerpt:
      "SEO, AEO, GEO et données structurées : ce qu'un entrepreneur québécois doit faire pour être compris et recommandé par les systèmes intelligents.",
  },
  {
    slug: "fournisseur-peinture-plus-contrats",
    title: "Comment un fournisseur de peinture a augmenté ses ventes en aidant ses entrepreneurs à décrocher plus de contrats",
    excerpt:
      "Pourquoi aider ses entrepreneurs à obtenir plus de contrats peut devenir le meilleur programme de fidélisation d'un fournisseur.",
  },
  {
    slug: "moins-de-soumissions-plus-de-factures",
    title: "Moins de soumissions, plus de factures",
    excerpt:
      "Pourquoi les entrepreneurs québécois doivent viser de meilleurs rendez-vous plutôt que davantage de leads.",
  },
  {
    slug: "badges-choix-consommateur-2026",
    title: "Les badges « Choix du consommateur » suffisent-ils encore en 2026?",
    excerpt: "Ce que les moteurs IA voient désormais au-delà du marketing.",
  },
  {
    slug: "verifier-grenier-avant-fenetres-thermopompe",
    title: "Vérifier le grenier avant les fenêtres ou la thermopompe",
    excerpt: "L'ordre des travaux qui protège réellement le budget d'un propriétaire.",
  },
];

function readingTime(wordCount?: number): number {
  return Math.max(1, Math.ceil((wordCount || 800) / 250));
}

export default function PageArticlesRecentCompressedFeed() {
  const { data: articles, isLoading, isError, refetch } = useQuery({
    queryKey: ["articles-recent-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_articles")
        .select("id, slug, title, meta_description, word_count, city, service_category, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const featured = articles?.[0];
  const rest = articles?.slice(1) || [];

  return (
    <>
      <SeoHead
        title="Articles récents — UNPRO"
        description="Découvrez les derniers articles UNPRO sur la rénovation, la construction et l'entretien résidentiel au Québec."
        canonical="https://unpro.ca/articles"
      />

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Articles récents</h1>
            <p className="text-sm text-muted-foreground">Guides, analyses et actualités pour propriétaires et entrepreneurs au Québec.</p>
          </motion.div>

          {/* Analyses éditoriales UNPRO */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Analyses UNPRO</h2>
            <ul className="space-y-2">
              {EDITORIALS.map((e) => (
                <li key={e.slug}>
                  <Link
                    to={`/articles/${e.slug}`}
                    className="block rounded-xl border border-border/50 bg-card/40 p-4 hover:border-primary/40 transition-colors"
                  >
                    <p className="text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{e.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              <SkeletonArticleCard />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonArticleCard />
                <SkeletonArticleCard />
                <SkeletonArticleCard />
                <SkeletonArticleCard />
              </div>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground text-sm">Impossible de charger les articles.</p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Réessayer
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && articles?.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground text-sm">Aucun article publié pour le moment.</p>
            </div>
          )}

          {/* Featured */}
          {featured && (
            <HeroArticleFeatured
              id={featured.id}
              slug={featured.slug}
              title={featured.title}
              excerpt={featured.meta_description || ""}
              category={featured.service_category || "Général"}
              city={featured.city || undefined}
              readingTime={readingTime(featured.word_count)}
              publishedAt={featured.created_at}
            />
          )}

          {/* Feed grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rest.map((a, i) => (
                <motion.div
                  key={a.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(i, 8) }}
                >
                  <CardArticleCompressed
                    id={a.id}
                    slug={a.slug}
                    title={a.title}
                    excerpt={a.meta_description || ""}
                    category={a.service_category || "Général"}
                    city={a.city || undefined}
                    readingTime={readingTime(a.word_count)}
                    publishedAt={a.created_at}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
