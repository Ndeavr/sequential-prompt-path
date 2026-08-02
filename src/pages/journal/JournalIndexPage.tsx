import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles } from "lucide-react";
import PriorityTopicLinks from "@/seo/components/PriorityTopicLinks";
import { DEFAULT_OG_IMAGE } from "@/seo/ogImage";


const TIER_LABEL: Record<string, string> = {
  flagship: "Thèse fondatrice",
  thesis: "Thèse",
  report: "Rapport",
  essay: "Essai",
};

const JOURNAL_TITLE = "UNPRO Intelligence Journal — Thèses d'infrastructure";
const JOURNAL_DESCRIPTION =
  "Le UNPRO Intelligence Journal publie les thèses d'infrastructure d'UNPRO sur la propriété résidentielle, l'IA opérationnelle et l'économie de la confiance.";
const JOURNAL_URL = "https://unpro.ca/journal";

export default function JournalIndexPage() {


  const { data: articles = [] } = useQuery({
    queryKey: ["journal-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_articles")
        .select("slug,title,dek,reading_time_minutes,tier,published_at,journal_series(title,slug)")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: series = [] } = useQuery({
    queryKey: ["journal-series"],
    queryFn: async () => {
      const { data } = await supabase.from("journal_series").select("*").order("order_index");
      return data ?? [];
    },
  });

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <main className="min-h-screen bg-[#060B14] text-white">
      {/* Hero */}
      <section className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-32">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 mb-6">
            <Sparkles className="h-3 w-3" />
            UNPRO Research
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Le journal d'intelligence de l'infrastructure résidentielle.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
            Thèses, essais et rapports sur la couche d'infrastructure IA qui transforme la propriété, l'entretien, la confiance et l'exécution sur le terrain.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="border-b border-white/5">
          <Link to={`/journal/${featured.slug}`} className="block group">
            <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-400/80 mb-4">
                À la une · {TIER_LABEL[featured.tier] ?? featured.tier}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-4xl group-hover:text-amber-200 transition-colors">
                {featured.title}
              </h2>
              <p className="mt-5 text-lg text-white/70 max-w-3xl leading-relaxed">{featured.dek}</p>
              <div className="mt-6 flex items-center gap-4 text-sm text-white/40">
                <span>{featured.reading_time_minutes} min de lecture</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 text-amber-300/80 group-hover:translate-x-0.5 transition-transform">
                  Lire la thèse <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Series */}
      {series.length > 0 && (
        <section className="border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Séries</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {series.map((s: any) => (
                <div key={s.id} className="rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-colors">
                  <h4 className="font-semibold text-white">{s.title}</h4>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Articles list */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-8">Toutes les publications</h3>
          {rest.length === 0 && articles.length === 0 ? (
            <p className="text-white/50">Le corpus initial sera publié prochainement.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {rest.map((a: any) => (
                <Link
                  key={a.slug}
                  to={`/journal/${a.slug}`}
                  className="block py-6 group"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-white/30 mb-2">
                    {TIER_LABEL[a.tier] ?? a.tier}
                    {a.journal_series ? ` · ${a.journal_series.title}` : ""}
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold group-hover:text-amber-200 transition-colors">
                    {a.title}
                  </h4>
                  <p className="mt-2 text-white/60 max-w-3xl">{a.dek}</p>
                  <div className="mt-2 text-xs text-white/30">{a.reading_time_minutes} min</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI ingestion footer */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-10 text-xs text-white/40 flex flex-wrap gap-4 justify-between">
          <span>Optimisé pour ingestion IA · NotebookLM · Perplexity · ChatGPT · Gemini</span>
          <a
            href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-export-corpus`}
            className="underline hover:text-white"
            target="_blank"
            rel="noopener"
          >
            Corpus complet (Markdown)
          </a>
        </div>
      </section>

      <PriorityTopicLinks variant="dark" />
    </main>

  );
}
