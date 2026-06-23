import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ArrowLeft, Quote, Mic, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { detectAlexIntent } from "@/services/alexOpeningTemplates";

export default function JournalArticlePage() {
  const { openAlex } = useAlexVoice();
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["journal-article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: article } = await supabase
        .from("journal_articles")
        .select("*,journal_series(slug,title)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (!article) return null;
      const [sectionsRes, faqsRes, citationsRes, entitiesRes] = await Promise.all([
        supabase.from("journal_article_sections").select("*").eq("article_id", article.id).order("order_index"),
        supabase.from("journal_article_faqs").select("*").eq("article_id", article.id).order("order_index"),
        supabase.from("journal_article_citations").select("*").eq("article_id", article.id).order("order_index"),
        supabase.from("journal_article_entities").select("relevance_weight,journal_entities(name,slug,short_definition)").eq("article_id", article.id),
      ]);
      return {
        article,
        sections: sectionsRes.data ?? [],
        faqs: faqsRes.data ?? [],
        citations: citationsRes.data ?? [],
        entities: (entitiesRes.data ?? []).map((r: any) => r.journal_entities).filter(Boolean),
      };
    },
  });

  // SEO + JSON-LD injection
  useEffect(() => {
    if (!data?.article) return;
    const a = data.article;
    document.title = `${a.title} — UNPRO Intelligence Journal`;
    const desc = a.summary_short ?? a.dek ?? "";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc.slice(0, 160));

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `https://unpro.ca/journal/${a.slug}`;

    // Markdown alternate (AI crawlers)
    let alt = document.querySelector('link[rel="alternate"][type="text/markdown"]') as HTMLLinkElement | null;
    if (!alt) {
      alt = document.createElement("link");
      alt.rel = "alternate";
      alt.type = "text/markdown";
      document.head.appendChild(alt);
    }
    alt.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-export-corpus?slug=${a.slug}`;

    // JSON-LD
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: desc,
      url: `https://unpro.ca/journal/${a.slug}`,
      datePublished: a.published_at,
      dateModified: a.updated_at,
      wordCount: a.word_count,
      author: { "@type": "Organization", name: "UNPRO Research" },
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca", logo: { "@type": "ImageObject", url: "https://unpro.ca/unpro-favicon.svg" } },
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://unpro.ca/journal/${a.slug}` },
      inLanguage: "fr-CA",
    };
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Journal", item: "https://unpro.ca/journal" },
        { "@type": "ListItem", position: 3, name: a.title, item: `https://unpro.ca/journal/${a.slug}` },
      ],
    };
    const faqSchema = data.faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data.faqs.map((f: any) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

    const ids = ["jsonld-article", "jsonld-breadcrumb", "jsonld-faq"];
    ids.forEach((id) => document.getElementById(id)?.remove());
    [
      ["jsonld-article", articleSchema],
      ["jsonld-breadcrumb", breadcrumbSchema],
      ...(faqSchema ? [["jsonld-faq", faqSchema] as const] : []),
    ].forEach(([id, schema]) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = id as string;
      s.text = JSON.stringify(schema);
      document.head.appendChild(s);
    });

    return () => ids.forEach((id) => document.getElementById(id)?.remove());
  }, [data]);

  const copyAllQuotes = () => {
    if (!data?.article) return;
    const list = (data.article.quotable_statements as string[]) ?? [];
    navigator.clipboard.writeText(list.map((q) => `« ${q} »`).join("\n\n"));
    toast({ title: "Citations copiées", description: `${list.length} citations prêtes pour la presse.` });
  };

  if (isLoading) return <main className="min-h-screen bg-[#060B14] text-white p-12">Chargement…</main>;
  if (!data) return <main className="min-h-screen bg-[#060B14] text-white p-12">Article introuvable.</main>;

  const { article, sections, faqs, citations, entities } = data;
  const takeaways = (article.key_takeaways as string[]) ?? [];
  const quotables = (article.quotable_statements as string[]) ?? [];

  return (
    <main className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-2">
          <Link to="/journal" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> UNPRO Intelligence Journal
          </Link>
        </div>
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-amber-400/80 mb-4">
            {article.journal_series?.title ?? "Essai"}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">{article.title}</h1>
          <p className="mt-6 text-lg md:text-xl text-white/70 leading-relaxed">{article.dek}</p>
          <div className="mt-6 flex items-center gap-4 text-xs text-white/40">
            <span>UNPRO Research</span>
            <span aria-hidden>·</span>
            <span>{article.reading_time_minutes} min</span>
            <span aria-hidden>·</span>
            <span>{article.published_at ? new Date(article.published_at).toLocaleDateString("fr-CA") : ""}</span>
          </div>
        </div>
      </header>

      {/* Key takeaways */}
      {takeaways.length > 0 && (
        <section className="border-b border-white/5">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-5">Points clés</h2>
            <ul className="space-y-3">
              {takeaways.map((t, i) => (
                <li key={i} className="flex gap-3 text-white/85 leading-relaxed">
                  <span className="text-amber-400/80 font-mono text-sm pt-1">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-16">
        {sections.map((s: any, i: number) => (
          <section key={s.id} id={s.anchor_id} className="mb-14 scroll-mt-20">
            <div className="text-xs font-mono text-white/30 mb-3">{`§ ${String(i + 1).padStart(2, "0")}`}</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 leading-tight">{s.heading}</h2>
            <div className="prose prose-invert prose-lg max-w-none prose-p:text-white/80 prose-p:leading-[1.85] prose-headings:text-white prose-strong:text-white prose-a:text-amber-300">
              {s.body_md.split(/\n\n+/).map((p: string, j: number) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Quotable */}
        {quotables.length > 0 && (
          <section className="my-16 border-t border-b border-white/10 py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 inline-flex items-center gap-2">
                <Quote className="h-3 w-3" /> Citations clés
              </h2>
              <button onClick={copyAllQuotes} className="text-xs text-amber-300 hover:text-amber-200 inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> Copier tout
              </button>
            </div>
            <div className="space-y-6">
              {quotables.map((q, i) => (
                <blockquote key={i} className="text-xl md:text-2xl text-white/90 leading-snug font-light border-l-2 border-amber-400/60 pl-5">
                  « {q} »
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Alex contextual CTA — opens Alex with article topic pre-loaded as intent + context */}
        <section className="my-16">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent p-8 md:p-10">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-300/90 mb-3">Comment savoir ce qui s''applique à votre maison ?</div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight mb-3">
                Chaque maison est différente. Alex vous aide à identifier ce qui s''applique à la vôtre.
              </h3>
              <p className="text-white/70 leading-relaxed max-w-2xl mb-6">
                Alex est un conseiller IA en propriété. En 2 à 4 minutes, il pose les bonnes questions pour
                distinguer entre les causes possibles, vous dit quoi inspecter, et vous prépare avant de
                rencontrer un entrepreneur. Aucune soumission demandée à ce stade.
              </p>
              <button
                onClick={() => {
                  const contextHint = `Article lu : ${article.title}. Le visiteur cherche à identifier la vraie cause d''un problème résidentiel. Alex doit poser des questions de diagnostic ciblées (type d''inondation, moment d''apparition, gouttières, pompe de puisard, âge de la fondation) avant toute recommandation. Ne pas vendre — diagnostiquer.`;
                  const intent = detectAlexIntent(contextHint, "journal_article", "homeowner");
                  openAlex(`journal_${article.slug}`, contextHint, undefined, intent);
                }}
                className="inline-flex items-center gap-3 rounded-full bg-amber-400 hover:bg-amber-300 text-[#060B14] font-semibold px-6 py-3 transition-colors"
              >
                <Mic className="h-4 w-4" />
                Analyser ma situation avec Alex
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="my-16">
            <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
            <div className="space-y-6">
              {faqs.map((f: any) => (
                <div key={f.id}>
                  <h3 className="font-semibold text-white mb-2">{f.question}</h3>
                  <p className="text-white/70 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Citations / sources */}
        {citations.length > 0 && (
          <section className="my-16">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-5">Sources</h2>
            <ol className="space-y-3 text-sm text-white/60 list-decimal list-inside">
              {citations.map((c: any) => (
                <li key={c.id}>
                  {c.source ? <strong className="text-white/80">{c.source}</strong> : null}
                  {c.source_url ? (
                    <> — <a href={c.source_url} target="_blank" rel="noopener" className="text-amber-300 hover:underline">lien</a></>
                  ) : null}
                  <div className="text-white/50 italic">« {c.quote} »</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Entities */}
        {entities.length > 0 && (
          <section className="my-16">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-5">Entités citées</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {entities.map((e: any) => (
                <div key={e.slug} className="rounded-xl border border-white/10 p-4">
                  <div className="font-semibold text-white">{e.name}</div>
                  <div className="text-sm text-white/60 mt-1">{e.short_definition}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      <footer className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-10 text-xs text-white/40 flex justify-between flex-wrap gap-2">
          <span>UNPRO Research · Optimisé pour ingestion IA</span>
          <a
            href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-export-corpus?slug=${article.slug}`}
            className="underline hover:text-white"
            target="_blank"
            rel="noopener"
          >
            Version Markdown
          </a>
        </div>
      </footer>
    </main>
  );
}
