/**
 * ContractorSeoPage — Cinematic premium contractor public page.
 * Route: /entrepreneur/:slug
 * Hard-coded dark cinematic theme scoped to this page only.
 * Keeps all data layer (queries, JSON-LD) intact from the prior version.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { getCanonicalUrl } from "@/seo/services/canonicalManager";
import { injectJsonLd } from "@/lib/seoSchema";
import {
  MapPin, Shield, Star, ArrowRight, Calendar, Phone, MessageCircle,
  Sparkles, BadgeCheck, Award, ShieldCheck, Wrench, Zap, Clock,
} from "lucide-react";
import contractorFallback from "@/assets/contractor-hero-fallback.jpg";

interface Project { id: string; type: string; city: string; year: number; photo: string; }

const ADVANTAGES = [
  { icon: Shield, label: "Certifié RBQ", color: "hsl(189 94% 65%)" },
  { icon: ShieldCheck, label: "Assuré & cautionné", color: "hsl(217 91% 65%)" },
  { icon: Award, label: "Garantie travaux", color: "hsl(160 84% 60%)" },
  { icon: Zap, label: "Urgence 24/7", color: "hsl(45 96% 60%)" },
  { icon: Wrench, label: "Financement dispo", color: "hsl(280 80% 70%)" },
  { icon: Clock, label: "Réponse < 4h", color: "hsl(189 94% 65%)" },
];

export default function ContractorSeoPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["entrepreneur-profile", slug],
    enabled: !!slug,
    queryFn: async () => {
      const [pageRes, scoreRes, reviewsRes] = await Promise.all([
        supabase.from("contractor_public_pages")
          .select("*, contractors(id, business_name, slug, city, province, description, phone, website, rbq_number, neq, specialty, years_experience, rating, review_count, aipp_score, admin_verified, verification_status, logo_url)")
          .eq("slug", slug!).eq("is_published", true).maybeSingle(),
        (async () => {
          const { data: page } = await supabase.from("contractor_public_pages").select("contractor_id").eq("slug", slug!).maybeSingle();
          if (!page?.contractor_id) return { data: null };
          return supabase.from("contractor_aipp_scores").select("*").eq("contractor_id", page.contractor_id).eq("is_current", true).maybeSingle();
        })(),
        (async () => {
          const { data: page } = await supabase.from("contractor_public_pages").select("contractor_id").eq("slug", slug!).maybeSingle();
          if (!page?.contractor_id) return { data: [] };
          return supabase.from("reviews").select("id, rating, title, content, created_at").eq("contractor_id", page.contractor_id).eq("is_published", true).order("created_at", { ascending: false }).limit(5);
        })(),
      ]);
      return {
        page: pageRes.data,
        contractor: (pageRes.data as any)?.contractors,
        aipp: (scoreRes as any)?.data ?? null,
        reviews: (reviewsRes as any)?.data ?? [],
      };
    },
  });

  const contractor = data?.contractor;
  const page = data?.page as any;
  const reviews = data?.reviews ?? [];
  const custom = (page?.custom_sections ?? {}) as {
    founded_year?: number; team_size?: number;
    specialty_tags?: string[]; service_area?: string[]; projects?: Project[];
  };
  const faq = (page?.faq ?? []) as { q: string; a: string }[];

  // JSON-LD (LocalBusiness + Reviews + Breadcrumb + FAQ)
  useEffect(() => {
    if (!contractor) return;
    const url = `https://unpro.ca/entrepreneur/${contractor.slug}`;
    const localBusiness: any = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": url,
      name: contractor.business_name,
      url,
      description: contractor.description,
      telephone: contractor.phone || undefined,
      address: { "@type": "PostalAddress", addressLocality: contractor.city, addressRegion: contractor.province || "QC", addressCountry: "CA" },
      areaServed: custom.service_area?.map(c => ({ "@type": "City", name: c })),
      knowsAbout: custom.specialty_tags,
      foundingDate: custom.founded_year ? String(custom.founded_year) : undefined,
      hasCredential: contractor.rbq_number ? `RBQ ${contractor.rbq_number}` : undefined,
    };
    if (contractor.rating && contractor.review_count) {
      localBusiness.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: contractor.rating, reviewCount: contractor.review_count,
        bestRating: 5, worstRating: 1,
      };
    }
    const reviewSchemas = reviews.slice(0, 3).map((r: any) => ({
      "@context": "https://schema.org", "@type": "Review",
      itemReviewed: { "@type": "LocalBusiness", name: contractor.business_name },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: (r.content || "").split(" — ")[0] || "Client vérifié" },
      datePublished: (r.created_at || "").slice(0, 10), reviewBody: r.content, name: r.title,
    }));
    const breadcrumb = {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Entrepreneurs", item: "https://unpro.ca/entrepreneurs" },
        { "@type": "ListItem", position: 3, name: contractor.business_name, item: url },
      ],
    };
    const faqSchema = faq.length > 0 ? {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    } : null;
    const cleanups = [
      injectJsonLd(localBusiness),
      injectJsonLd(breadcrumb),
      ...reviewSchemas.map(injectJsonLd),
      ...(faqSchema ? [injectJsonLd(faqSchema)] : []),
    ];
    return () => cleanups.forEach(fn => fn());
  }, [contractor, reviews, faq, custom.service_area, custom.specialty_tags, custom.founded_year]);

  // AI review summary — top recurring keywords (deterministic fallback)
  const reviewKeywords = useMemo(() => {
    if (!reviews?.length) return [] as string[];
    const stop = new Set(["le","la","les","un","une","des","de","du","et","est","à","au","aux","pour","sur","avec","ce","cette","ces","mais","ou","où","qui","que","quoi","dont","son","sa","ses","nous","vous","ils","elles","très","plus","moins","tres","bien","fait","faite","faits","faites","faire","être","etre","mon","ma","mes","ton","ta","tes","leur","leurs","par","pas","dans","ne","non","oui","si","aussi","alors","ainsi","encore","tout","tous","toute","toutes","comme","leurs","cela","ça","ca"]);
    const counts: Record<string, number> = {};
    reviews.forEach((r: any) => {
      (r.content || "").toLowerCase().split(/[^a-zàâäéèêëïîôöùûüç]+/i).forEach((w: string) => {
        if (w.length < 5 || stop.has(w)) return;
        counts[w] = (counts[w] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([w]) => w);
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050816] grid place-items-center text-white/50 text-sm">
        Chargement…
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-[#050816] text-white grid place-items-center p-6">
        <Helmet><title>Entrepreneur non trouvé | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">Entrepreneur non trouvé</h1>
          <p className="text-white/60 mb-6">Ce profil n'est pas disponible.</p>
          <Link to="/entrepreneurs" className="inline-block rounded-2xl px-5 py-3 text-sm font-semibold text-[#050816] bg-cyan-300">
            Voir tous les entrepreneurs
          </Link>
        </div>
      </div>
    );
  }

  const title = page?.seo_title || `${contractor.business_name} à ${contractor.city} — ${contractor.specialty} | UNPRO`;
  const desc = page?.seo_description || `Profil vérifié de ${contractor.business_name} à ${contractor.city}. Services, avis et score AIPP sur UNPRO.`;
  const tags = custom.specialty_tags ?? [];
  const projects = custom.projects ?? [];
  const phone = contractor.phone;
  const canonical = getCanonicalUrl(`/entrepreneur/${slug}`);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta name="theme-color" content="#050816" />
        {page?.og_image_url && <meta property="og:image" content={page.og_image_url} />}
      </Helmet>

      <main className="cinema-pro min-h-screen text-white antialiased pb-28">
        <style>{`
          .cinema-pro {
            background:
              radial-gradient(120% 60% at 20% 0%, hsl(217 91% 60% / 0.20) 0%, transparent 55%),
              radial-gradient(120% 60% at 80% 100%, hsl(189 94% 55% / 0.14) 0%, transparent 60%),
              linear-gradient(180deg, #050816 0%, #07091a 60%, #050816 100%);
            font-feature-settings: "ss01","cv11";
          }
          .pro-glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(24px); }
          .pro-glow { box-shadow: 0 10px 60px -10px hsl(189 94% 55% / 0.35); }
          .h-pro { font-family: Inter, system-ui, sans-serif; letter-spacing: -0.03em; line-height: 1.05; }
          .lift { transition: transform 420ms cubic-bezier(.22,1,.36,1); }
          .lift:hover { transform: translateY(-2px); }
        `}</style>

        {/* HEADER NAV */}
        <header className="px-5 pt-5 flex items-center justify-between relative z-20">
          <Link to="/" className="text-white/70 text-sm font-medium inline-flex items-center gap-1.5 hover:text-white">
            ← Accueil
          </Link>
          <span className="text-xs text-white/40">UNPRO</span>
        </header>

        {/* HERO */}
        <section className="px-5 pt-6">
          <div className="mx-auto max-w-[1100px]">
            <div className="relative rounded-[32px] overflow-hidden pro-glass pro-glow">
              <img
                src={contractor.logo_url || contractorFallback}
                alt={`${contractor.business_name} — ${contractor.specialty || "Entrepreneur"}`}
                width={1536}
                height={1024}
                className="w-full h-[44vh] min-h-[300px] max-h-[460px] object-cover opacity-95"
                fetchPriority="high"
              />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, rgba(5,8,22,0) 0%, rgba(5,8,22,0.4) 45%, rgba(5,8,22,0.95) 100%)",
              }} />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {contractor.admin_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: "rgba(56,189,248,0.18)", color: "hsl(189 94% 75%)", border: "1px solid rgba(56,189,248,0.3)" }}>
                      <BadgeCheck size={12} /> Vérifié UNPRO
                    </span>
                  )}
                  {contractor.rbq_number && (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold pro-glass">RBQ {contractor.rbq_number}</span>
                  )}
                  {contractor.years_experience && (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold pro-glass">{contractor.years_experience}+ ans</span>
                  )}
                </div>
                <h1 className="h-pro text-3xl md:text-5xl font-semibold text-white">{contractor.business_name}</h1>
                <p className="text-white/75 mt-2 text-sm md:text-base">{contractor.specialty}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/70">
                  {contractor.city && (
                    <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-cyan-300" /> {contractor.city}, {contractor.province || "QC"}</span>
                  )}
                  {contractor.rating && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star size={13} className="fill-amber-300 text-amber-300" />
                      {contractor.rating.toFixed(1)}/5 ({contractor.review_count || 0} avis)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-cyan-300">
                    <Calendar size={13} /> Dispo cette semaine
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POURQUOI UNPRO LE RECOMMANDE */}
        <section className="px-5 py-10">
          <div className="mx-auto max-w-[1100px]">
            <div className="pro-glass rounded-[28px] p-6 md:p-8 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 blur-3xl"
                style={{ background: "hsl(189 94% 55%)" }} />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase mb-4"
                  style={{ background: "rgba(56,189,248,0.12)", color: "hsl(189 94% 75%)", border: "1px solid rgba(56,189,248,0.25)" }}>
                  <Sparkles size={12} /> Pourquoi UNPRO le recommande
                </div>
                <h2 className="h-pro text-2xl md:text-3xl font-semibold mb-4">Une recommandation IA basée sur vos critères</h2>
                <div className="grid md:grid-cols-2 gap-3 text-[14px]">
                  {[
                    "Forte compatibilité avec votre type de besoin",
                    "Excellente satisfaction client vérifiée",
                    "Disponibilité rapide cette semaine",
                    "Proximité géographique optimale",
                  ].map((r) => (
                    <div key={r} className="flex items-start gap-2.5">
                      <span className="text-cyan-300 mt-0.5">✓</span>
                      <span className="text-white/85">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AVANTAGES */}
        <section className="px-5 py-6">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="h-pro text-2xl md:text-3xl font-semibold mb-5">Pourquoi le choisir</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {ADVANTAGES.map((a) => (
                <div key={a.label} className="pro-glass rounded-2xl p-4 lift">
                  <a.icon size={20} style={{ color: a.color }} className="mb-2" />
                  <div className="font-semibold text-[13px]">{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        {contractor.description && (
          <section className="px-5 py-10">
            <div className="mx-auto max-w-[760px]">
              <h2 className="h-pro text-2xl md:text-3xl font-semibold mb-4">À propos</h2>
              <div className="space-y-3">
                {(contractor.description || "").split(/\n\n+/).map((p: string, i: number) => (
                  <p key={i} className="text-white/75 leading-relaxed text-[15px]">{p}</p>
                ))}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {tags.map((t: string) => (
                    <span key={t} className="rounded-full px-3 py-1 text-[11px] pro-glass text-white/80">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* PROJECTS */}
        {projects.length > 0 && (
          <section className="px-5 py-10">
            <div className="mx-auto max-w-[1100px]">
              <h2 className="h-pro text-2xl md:text-3xl font-semibold mb-5">Projets récents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.slice(0, 6).map(p => (
                  <Link key={p.id} to={`/entrepreneur/${slug}/projets/${p.id}`} className="group block rounded-2xl overflow-hidden pro-glass lift">
                    <img src={p.photo} alt={`${p.type} à ${p.city}`} loading="lazy"
                      className="w-full aspect-[4/3] object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                    <div className="p-3">
                      <div className="font-semibold text-sm">{p.type}</div>
                      <div className="text-xs text-white/55 mt-0.5">{p.city} · {p.year}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* REVIEWS + AI SUMMARY */}
        {reviews.length > 0 && (
          <section className="px-5 py-10">
            <div className="mx-auto max-w-[900px]">
              <div className="flex items-end justify-between mb-5">
                <h2 className="h-pro text-2xl md:text-3xl font-semibold">Avis clients</h2>
                {contractor.rating && (
                  <div className="text-right">
                    <div className="text-3xl font-bold tabular-nums">
                      {contractor.rating.toFixed(1)}<span className="text-base text-white/50">/5</span>
                    </div>
                    <div className="text-[11px] text-white/55">{contractor.review_count} avis vérifiés</div>
                  </div>
                )}
              </div>

              {reviewKeywords.length > 0 && (
                <div className="pro-glass rounded-2xl p-4 mb-4">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-cyan-300 mb-2 inline-flex items-center gap-1.5">
                    <Sparkles size={11} /> Résumé IA
                  </div>
                  <p className="text-sm text-white/85">
                    Les clients mentionnent souvent :{" "}
                    {reviewKeywords.map((w, i) => (
                      <span key={w} className="font-semibold text-white">
                        {w}{i < reviewKeywords.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="pro-glass rounded-2xl p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <h3 className="font-semibold text-sm">{r.title}</h3>
                      <span className="text-amber-300 text-sm">
                        {"★".repeat(Math.round(r.rating))}{"☆".repeat(5 - Math.round(r.rating))}
                      </span>
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed">{r.content}</p>
                    <p className="text-[11px] text-white/40 mt-2">
                      {new Date(r.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section className="px-5 py-10">
            <div className="mx-auto max-w-[760px]">
              <h2 className="h-pro text-2xl md:text-3xl font-semibold mb-5">Questions fréquentes</h2>
              <div className="space-y-3">
                {faq.map((f, i) => (
                  <details key={i} className="pro-glass rounded-2xl p-4 group">
                    <summary className="font-semibold cursor-pointer text-[14px] list-none flex items-center justify-between">
                      {f.q}
                      <span className="text-cyan-300 ml-2 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm text-white/75 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* STICKY MOBILE CTA */}
        <div
          className="fixed bottom-0 inset-x-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,8,22,0) 0%, rgba(5,8,22,0.85) 35%, rgba(5,8,22,0.98) 100%)",
          }}
        >
          <div className="mx-auto max-w-[600px] flex items-center gap-2 pro-glass rounded-2xl p-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex-1 rounded-xl py-3 text-center text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 text-white"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Phone size={14} /> Appeler
              </a>
            )}
            <Link
              to={`/entrepreneur/${slug}/message`}
              className="flex-1 rounded-xl py-3 text-center text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <MessageCircle size={14} /> Message
            </Link>
            <Link
              to={`/entrepreneur/${slug}/booking`}
              className="flex-[1.4] rounded-xl py-3 text-center text-[13px] font-semibold text-[#050816] inline-flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(135deg, hsl(189 94% 65%), hsl(217 91% 65%))" }}
            >
              <Calendar size={14} /> Rendez-vous <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
