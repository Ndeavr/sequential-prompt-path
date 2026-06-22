/**
 * UNPRO — Contractor SEO Public Page
 * Route: /entrepreneur/:slug
 * Profil entreprise complet : Hero, À propos, Projets, Avis, AIPP, Contact.
 * Mirroir SPA du HTML SSR servi par l'edge function `prerender` aux bots.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { getCanonicalUrl } from "@/seo/services/canonicalManager";
import { injectJsonLd } from "@/lib/seoSchema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Shield, Star, ArrowRight, Users, Calendar } from "lucide-react";
import AippScoreWidget from "@/components/entrepreneur/AippScoreWidget";
import EntrepreneurContactStrip from "@/components/entrepreneur/EntrepreneurContactStrip";

interface Project { id: string; type: string; city: string; year: number; photo: string; }

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
  const aipp = data?.aipp;
  const reviews = data?.reviews ?? [];
  const custom = (page?.custom_sections ?? {}) as {
    founded_year?: number; team_size?: number;
    specialty_tags?: string[]; service_area?: string[]; projects?: Project[];
  };
  const faq = (page?.faq ?? []) as { q: string; a: string }[];

  // Inject JSON-LD (LocalBusiness + Reviews + Breadcrumb + FAQ)
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
        ratingValue: contractor.rating,
        reviewCount: contractor.review_count,
        bestRating: 5,
        worstRating: 1,
      };
    }
    const reviewSchemas = reviews.slice(0, 3).map((r: any) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: { "@type": "LocalBusiness", name: contractor.business_name },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: (r.content || "").split(" — ")[0] || "Client vérifié" },
      datePublished: (r.created_at || "").slice(0, 10),
      reviewBody: r.content,
      name: r.title,
    }));
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Entrepreneurs", item: "https://unpro.ca/entrepreneurs" },
        { "@type": "ListItem", position: 3, name: contractor.business_name, item: url },
      ],
    };
    const faqSchema = faq.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
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

  if (isLoading) {
    return <MainLayout><div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Chargement…</div></MainLayout>;
  }

  if (!contractor) {
    return (
      <MainLayout>
        <SeoHead title="Entrepreneur non trouvé | UNPRO" description="Ce profil n'existe pas ou n'est plus disponible." noindex />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Entrepreneur non trouvé</h1>
          <p className="text-muted-foreground mb-6">Ce profil n'est pas disponible.</p>
          <Link to="/"><Button>Parler à Alex</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const title = page?.seo_title || `${contractor.business_name} à ${contractor.city} — ${contractor.specialty} | UNPRO`;
  const desc = page?.seo_description || `Profil vérifié de ${contractor.business_name} à ${contractor.city}. Services, avis et score AIPP sur UNPRO.`;
  const tags = custom.specialty_tags ?? [];
  const projects = custom.projects ?? [];
  const phone = contractor.phone;
  const stars = (n: number) => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));

  return (
    <MainLayout>
      <SeoHead title={title} description={desc} canonical={getCanonicalUrl(`/entrepreneur/${slug}`)} ogImage={page?.og_image_url || undefined} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-10 space-y-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/entrepreneurs" className="hover:text-primary">Entrepreneurs</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{contractor.business_name}</span>
        </nav>

        {/* 3. Hero */}
        <header>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold leading-tight">{contractor.business_name}</h1>
              <h2 className="text-base md:text-lg text-muted-foreground mt-1">{contractor.specialty}</h2>
              <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {contractor.city}, {contractor.province || "QC"}</span>
                {contractor.rbq_number && <span>· RBQ {contractor.rbq_number}</span>}
                {contractor.rating && (
                  <span className="inline-flex items-center gap-1">
                    · <span aria-hidden className="text-amber-500">{stars(contractor.rating)}</span>
                    <span>{contractor.rating}/5 ({contractor.review_count} avis)</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {contractor.admin_verified && (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Shield className="w-3 h-3 mr-1" /> Vérifié UNPRO
              </Badge>
            )}
            {contractor.years_experience && <Badge variant="outline">{contractor.years_experience} ans d'expérience</Badge>}
            {contractor.neq && <Badge variant="outline">NEQ {contractor.neq}</Badge>}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-amber-400 text-black hover:bg-amber-300">
              <Link to={`/entrepreneur/${slug}/reclamer`}>
                Réclamer ce profil — 1 $ <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#contact">Obtenir une soumission</a>
            </Button>
          </div>
        </header>

        {/* 4. About */}
        <section aria-labelledby="about-h">
          <h2 id="about-h" className="text-xl md:text-2xl font-bold mb-4">À propos</h2>
          <div className="prose prose-invert max-w-none">
            {(contractor.description || "").split(/\n\n+/).map((p: string, i: number) => (
              <p key={i} className="text-foreground/90 leading-relaxed mb-3">{p}</p>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
            {custom.founded_year && (
              <div className="rounded-lg border bg-card p-3">
                <Calendar className="w-4 h-4 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Fondée en</div>
                <div className="font-semibold">{custom.founded_year}</div>
              </div>
            )}
            {custom.team_size && (
              <div className="rounded-lg border bg-card p-3">
                <Users className="w-4 h-4 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Équipe</div>
                <div className="font-semibold">{custom.team_size} personnes</div>
              </div>
            )}
            {contractor.years_experience && (
              <div className="rounded-lg border bg-card p-3">
                <Star className="w-4 h-4 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Expérience</div>
                <div className="font-semibold">{contractor.years_experience} ans</div>
              </div>
            )}
            {custom.service_area && custom.service_area.length > 0 && (
              <div className="rounded-lg border bg-card p-3">
                <MapPin className="w-4 h-4 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Zone desservie</div>
                <div className="font-semibold text-xs">{custom.service_area.slice(0, 3).join(", ")}{custom.service_area.length > 3 ? "…" : ""}</div>
              </div>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          )}
        </section>

        {/* 5. Projects gallery */}
        {projects.length > 0 && (
          <section id="projets" aria-labelledby="projects-h">
            <h2 id="projects-h" className="text-xl md:text-2xl font-bold mb-4">Projets récents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map(p => (
                <Link key={p.id} to={`/entrepreneur/${slug}/projets/${p.id}`} className="group">
                  <Card className="overflow-hidden h-full hover:border-primary/40 transition">
                    <img src={p.photo} alt={`${p.type} à ${p.city}`} loading="lazy" className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
                    <CardContent className="p-3">
                      <div className="font-semibold text-sm">{p.type}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.city} · {p.year}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 6. Reviews */}
        {reviews.length > 0 && (
          <section aria-labelledby="reviews-h">
            <div className="flex items-baseline justify-between mb-4">
              <h2 id="reviews-h" className="text-xl md:text-2xl font-bold">Avis clients</h2>
              {contractor.rating && (
                <div className="text-right">
                  <div className="text-3xl font-bold tabular-nums">{contractor.rating}<span className="text-lg text-muted-foreground">/5</span></div>
                  <div className="text-xs text-muted-foreground">{contractor.review_count} avis vérifiés</div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {reviews.map((r: any) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm">{r.title}</h3>
                    <span className="text-amber-500 text-sm" aria-label={`${r.rating} sur 5`}>{stars(r.rating)}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{r.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 7. AIPP Score Widget */}
        {aipp && (
          <section aria-labelledby="aipp-h">
            <h2 id="aipp-h" className="sr-only">Score AIPP</h2>
            <AippScoreWidget
              total={aipp.total_score}
              identity={aipp.identity_score ?? 0}
              trust={aipp.trust_score ?? 0}
              visibility={aipp.visibility_score ?? 0}
              conversion={aipp.conversion_score ?? 0}
              aiSeoReadiness={aipp.ai_seo_readiness_score ?? 0}
              confidence={aipp.score_confidence ?? undefined}
            />
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="text-xl md:text-2xl font-bold mb-4">Questions fréquentes</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <details key={i} className="rounded-lg border bg-card p-4">
                  <summary className="font-semibold cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* 8. Contact strip */}
        <section id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="sr-only">Contact</h2>
          <EntrepreneurContactStrip
            contractorId={contractor.id}
            contractorSlug={contractor.slug}
            contractorName={contractor.business_name}
            phone={phone}
          />
        </section>
      </article>
    </MainLayout>
  );
}
