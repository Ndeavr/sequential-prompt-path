import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";

export default function PageAippGeo() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("aipp_geo_pages").select("*").eq("slug", slug).maybeSingle();
      setPage(data); setLoading(false);
      if (data) supabase.from("aipp_geo_pages").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", data.id);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-[#050816] text-white/70 flex items-center justify-center">Chargement…</div>;
  if (!page) return <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">Page introuvable</div>;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.meta_description} />
        <link rel="canonical" href={`https://unpro.ca/geo/${page.slug}`} />
        <script type="application/ld+json">{JSON.stringify(page.jsonld)}</script>
        {page.faq?.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org", "@type": "FAQPage",
            mainEntity: page.faq.map((f: any) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } }))
          })}</script>
        )}
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 prose prose-invert prose-headings:tracking-tight prose-h1:text-5xl">
        <ReactMarkdown>{page.content_md}</ReactMarkdown>
        {page.faq?.length > 0 && (
          <section>
            <h2>Questions fréquentes</h2>
            {page.faq.map((f: any, i: number) => (
              <details key={i} className="rounded-xl border border-white/10 p-4 my-2 bg-white/[0.03]">
                <summary className="font-medium cursor-pointer">{f.question}</summary>
                <p className="text-white/70 mt-2">{f.answer}</p>
              </details>
            ))}
          </section>
        )}
      </article>
    </div>
  );
}
