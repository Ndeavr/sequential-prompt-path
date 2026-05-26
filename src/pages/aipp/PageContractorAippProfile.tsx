import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

export default function PageContractorAippProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [contractor, setContractor] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [ai, setAi] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [geoPages, setGeoPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("contractors").select("*").eq("slug", slug).single();
      if (!c) { setLoading(false); return; }
      setContractor(c);
      const [{ data: s }, { data: a }, { data: r }, { data: gp }] = await Promise.all([
        supabase.from("contractor_aipp_scores").select("*").eq("contractor_id", c.id).eq("is_current", true).maybeSingle(),
        supabase.from("contractor_ai_profiles").select("*").eq("contractor_id", c.id).eq("is_current", true).maybeSingle(),
        supabase.from("contractor_reviews_snapshot").select("*").eq("contractor_id", c.id).limit(5),
        supabase.from("aipp_geo_pages").select("slug,city,service,title").eq("contractor_id", c.id).limit(8),
      ]);
      setScore(s); setAi(a); setReviews(r ?? []); setGeoPages(gp ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-[#050816] text-white/70 flex items-center justify-center">Chargement…</div>;
  if (!contractor) return <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">Entrepreneur introuvable</div>;

  const total = score?.total_score ?? contractor.aipp_score ?? 0;
  const tier = score?.tier ?? "Émergent";
  const strengths: string[] = ai?.recommendation_reasons ?? [];
  const problems: string[] = ai?.best_for ?? [];

  const jsonld = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    name: contractor.business_name,
    url: `https://unpro.ca/pro/${contractor.slug}`,
    description: ai?.summary_fr ?? contractor.description,
    address: { "@type": "PostalAddress", addressLocality: contractor.city, addressRegion: "QC", addressCountry: "CA" },
    aggregateRating: contractor.review_count ? { "@type": "AggregateRating", ratingValue: contractor.rating ?? 4.5, reviewCount: contractor.review_count } : undefined,
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <Helmet>
        <title>{contractor.business_name} | AIPP MAX · UNPRO</title>
        <meta name="description" content={ai?.summary_fr ?? contractor.description ?? ""} />
        <link rel="canonical" href={`https://unpro.ca/pro/${contractor.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-12 max-w-5xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-cyan-900/10 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs tracking-widest text-cyan-300/80 mb-4">
            AIPP MAX · {tier}
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.04em] mb-3">{contractor.business_name}</h1>
          <p className="text-lg text-white/60">{contractor.specialty} · {contractor.city}, {contractor.province}</p>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { k: "Score AIPP", v: total },
              { k: "Visibilité IA", v: score?.visibility_score ?? 0 },
              { k: "Confiance", v: score?.trust_score ?? 0 },
              { k: "Conversion", v: score?.conversion_score ?? 0 },
              { k: "AI SEO", v: score?.ai_seo_readiness_score ?? 0 },
            ].map((m) => (
              <div key={m.k} className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4">
                <div className="text-3xl font-semibold text-white">{m.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/50 mt-1">{m.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Summary */}
      {ai?.summary_fr && (
        <section className="px-6 py-10 max-w-5xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-cyan-300/70 mb-3">Résumé intelligent</h2>
          <p className="text-xl text-white/80 leading-relaxed">{ai.summary_fr}</p>
        </section>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <section className="px-6 py-10 max-w-5xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-cyan-300/70 mb-4">Forces reconnues</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {strengths.map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-white/80">✓ {s}</div>
            ))}
          </div>
        </section>
      )}

      {/* Problems matched */}
      {problems.length > 0 && (
        <section className="px-6 py-10 max-w-5xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-cyan-300/70 mb-4">Problèmes résolus</h2>
          <div className="flex flex-wrap gap-2">
            {problems.map((p, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 text-sm">{p}</span>
            ))}
          </div>
        </section>
      )}

      {/* Geo pages */}
      {geoPages.length > 0 && (
        <section className="px-6 py-10 max-w-5xl mx-auto">
          <h2 className="text-sm uppercase tracking-widest text-cyan-300/70 mb-4">Zones d'expertise</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {geoPages.map((g) => (
              <Link key={g.slug} to={`/geo/${g.slug}`} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 hover:border-cyan-400/40 transition">
                <div className="text-white font-medium">{g.service}</div>
                <div className="text-white/50 text-sm">{g.city}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-16 max-w-5xl mx-auto text-center">
        <Link to="/alex" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-cyan-500 text-[#050816] font-semibold hover:bg-cyan-400 transition">
          Parler à Alex →
        </Link>
      </section>
    </div>
  );
}
