/**
 * UNPRO — AI-Indexed Profile (Universal AIPP Template)
 * Public route: /ai-indexed-profiles/:slug
 * Warm Neutral theme for SEO/AEO public surface.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Sparkles, MapPin,
  Award, ShieldCheck, Star,
} from "lucide-react";

type Profile = any;

/**
 * Compute trust level from validations.
 * L1 "Profil analysé par UNPRO"           — site/services détectés
 * L2 "Présence commerciale validée"       — web + (phone OU GMB) cohérents
 * L3 "Entreprise vérifiée"                — RBQ + NEQ confirmés
 * L4 "Entreprise certifiée UNPRO"         — docs réels uploadés (réservé)
 */
function computeTrust(v: any): { level: 1 | 2 | 3 | 4; label: string } {
  const ok = (s?: string) => s === "confirmed";
  if (v) {
    if (ok(v.documents_status) && ok(v.rbq_status) && ok(v.neq_status)) {
      return { level: 4, label: "Entreprise certifiée UNPRO" };
    }
    if (ok(v.rbq_status) && ok(v.neq_status)) {
      return { level: 3, label: "Entreprise vérifiée" };
    }
    if (ok(v.website_status) && (ok(v.phone_status) || ok(v.google_business_status) || ok(v.address_status))) {
      return { level: 2, label: "Présence commerciale validée" };
    }
  }
  return { level: 1, label: "Profil analysé par UNPRO" };
}

export default function PageAiIndexedProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: profile } = await supabase
        .from("aipp_profiles" as any)
        .select("*")
        .eq("slug", slug)
        .eq("public_status", "published")
        .maybeSingle();

      if (!profile) { setLoading(false); return; }
      const pid = (profile as Profile).id;

      const [services, locations, media, reviews, validations, scores, facts, sources] = await Promise.all([
        supabase.from("aipp_profile_services" as any).select("*").eq("profile_id", pid).order("sort_order"),
        supabase.from("aipp_profile_locations" as any).select("*").eq("profile_id", pid).order("sort_order"),
        supabase.from("aipp_profile_media" as any).select("*").eq("profile_id", pid).order("sort_order"),
        supabase.from("aipp_profile_reviews" as any).select("*").eq("profile_id", pid),
        supabase.from("aipp_profile_validations" as any).select("*").eq("profile_id", pid).maybeSingle(),
        supabase.from("aipp_profile_scores" as any).select("*").eq("profile_id", pid).maybeSingle(),
        supabase.from("aipp_entity_facts" as any).select("*").eq("profile_id", pid).maybeSingle(),
        supabase.from("aipp_profile_sources" as any).select("*").eq("profile_id", pid),
      ]);

      setData({
        profile,
        services: services.data || [],
        locations: locations.data || [],
        media: media.data || [],
        reviews: reviews.data || [],
        validations: validations.data,
        scores: scores.data,
        facts: facts.data,
        sources: sources.data || [],
      });
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center landing-warm">Chargement…</div>;
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center landing-warm">
        <div className="text-center"><h1 className="text-2xl font-bold">Profil introuvable</h1></div>
      </div>
    );
  }

  const { profile: p, services, locations, media, reviews, validations, scores, facts } = data;
  const canonical = p.canonical_url || `https://unpro.ca/ai-indexed-profiles/${p.slug}`;
  const aippScore = scores?.aipp_score ?? 0;
  const trustScore = scores?.trust_score ?? 0;

  // JSON-LD stack
  const jsonLdStack = [
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": `${canonical}#business`,
      name: p.company_name,
      legalName: p.legal_name || undefined,
      url: p.website_url || canonical,
      telephone: p.phone || undefined,
      email: p.email || undefined,
      image: p.hero_image_url || p.logo_url || undefined,
      logo: p.logo_url || undefined,
      description: p.long_ai_summary || p.short_ai_summary,
      areaServed: locations.map((l: any) => ({ "@type": "City", name: l.city })),
      address: p.primary_city ? {
        "@type": "PostalAddress",
        addressLocality: p.primary_city,
        addressRegion: "QC",
        addressCountry: "CA",
      } : undefined,
      ...(p.google_rating && p.google_review_count ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: p.google_rating,
          reviewCount: p.google_review_count,
        },
      } : {}),
      makesOffer: services.map((s: any) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.service_name },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": canonical,
      url: canonical,
      name: p.meta_title || p.company_name,
      description: p.meta_description,
      inLanguage: "fr-CA",
      isPartOf: { "@type": "WebSite", name: "UNPRO", url: "https://unpro.ca" },
      speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".aipp-summary"] },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "UNPRO", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Profils IA vérifiés", item: "https://unpro.ca/ai-indexed-profiles" },
        { "@type": "ListItem", position: 3, name: p.company_name, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `${p.company_name} est-elle vérifiée par UNPRO ?`,
          acceptedAnswer: { "@type": "Answer", text: `UNPRO a analysé les données publiques disponibles sur ${p.company_name} et structuré un profil basé sur les sources officielles, le site web et les répertoires publics.` } },
        { "@type": "Question", name: `Quels services offre ${p.company_name} ?`,
          acceptedAnswer: { "@type": "Answer", text: services.map((s: any) => s.service_name).join(", ") } },
        { "@type": "Question", name: `${p.company_name} dessert-elle ma ville ?`,
          acceptedAnswer: { "@type": "Answer", text: `Zones desservies : ${locations.map((l: any) => l.city).join(", ")}.` } },
        { "@type": "Question", name: `${p.company_name} a-t-elle une licence RBQ ?`,
          acceptedAnswer: { "@type": "Answer", text: validations?.rbq_status === "confirmed" ? `RBQ ${validations.rbq_number} confirmée par UNPRO.` : `Aucune licence RBQ confirmée par UNPRO à ce jour pour ${p.company_name}.` } },
        { "@type": "Question", name: `Peut-on demander un rendez-vous via UNPRO ?`,
          acceptedAnswer: { "@type": "Answer", text: "Oui. UNPRO permet la prise de rendez-vous directe avec les entreprises analysées." } },
        { "@type": "Question", name: `Comment UNPRO valide-t-elle les données ?`,
          acceptedAnswer: { "@type": "Answer", text: "UNPRO analyse les sources publiques (site web, registres officiels, avis, médias). Seules les informations confirmées sont affichées publiquement; les éléments à compléter restent dans le tableau de bord privé de l'entreprise." } },
      ],
    },
  ];

  // Only confirmed rows appear publicly. Unverified / not_found are hidden.
  const publicValidationRows: { label: string; value?: string }[] = [
    { label: "Nom légal", value: validations?.legal_name_status === "confirmed" ? p.legal_name : undefined },
    { label: "Nom commercial", value: validations?.name_status === "confirmed" ? (p.trade_name || p.company_name) : undefined },
    { label: "Téléphone", value: validations?.phone_status === "confirmed" ? p.phone : undefined },
    { label: "Site web", value: validations?.website_status === "confirmed" ? p.website_url : undefined },
    { label: "Courriel", value: validations?.email_status === "confirmed" ? p.email : undefined },
    { label: "Adresse / ville", value: validations?.address_status === "confirmed" ? p.primary_city : undefined },
    { label: "RBQ", value: validations?.rbq_status === "confirmed" ? validations?.rbq_number : undefined },
    { label: "NEQ", value: validations?.neq_status === "confirmed" ? validations?.neq_number : undefined },
    { label: "Google Business", value: validations?.google_business_status === "confirmed" ? p.google_business_url : undefined },
  ].filter((r) => !!r.value);

  const trust = computeTrust(validations);

  const goBook = () => navigate(`/rendez-vous?contractor=${encodeURIComponent(p.slug)}&trade=${encodeURIComponent(p.primary_trade || "")}&city=${encodeURIComponent(p.primary_city || "")}`);
  const goVerify = () => navigate(`/verification?company=${encodeURIComponent(p.company_name)}`);
  const goAnalyze = () => navigate(`/analyser-soumission?context=${encodeURIComponent(p.slug)}`);

  return (
    <div
      data-theme="warm"
      className="min-h-screen"
      style={{
        background: "#F7F6F0",
        color: "#1c1917",
        colorScheme: "light",
      }}
    >
      {/* Scoped token override so shadcn cards / badges stay readable on this page */}
      <style>{`
        [data-theme="warm"] {
          --background: 48 33% 97%;
          --foreground: 24 10% 10%;
          --card: 0 0% 100%;
          --card-foreground: 24 10% 10%;
          --muted: 30 12% 92%;
          --muted-foreground: 25 5% 35%;
          --border: 30 10% 88%;
          --primary: 24 10% 10%;
          --primary-foreground: 48 33% 97%;
        }
        [data-theme="warm"] h1, [data-theme="warm"] h2, [data-theme="warm"] h3 {
          color: #1c1917;
        }
      `}</style>

      <Helmet>
        <html lang="fr-CA" />
        <title>{p.meta_title || `${p.company_name} — Profil IA vérifié UNPRO`}</title>
        <meta name="description" content={p.meta_description || p.short_ai_summary} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={p.meta_title || p.company_name} />
        <meta property="og:description" content={p.meta_description || p.short_ai_summary} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="profile" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        {jsonLdStack.map((s, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
        ))}
      </Helmet>

      <div className="aipp-entity-facts sr-only" aria-hidden="true" data-aipp-facts>
        <pre>{JSON.stringify(facts?.facts ?? {}, null, 2)}</pre>
      </div>

      <main className="container mx-auto max-w-5xl px-4 py-10 md:py-16 space-y-12">
        {/* HERO */}
        <header className="text-center space-y-4">
          {p.logo_url ? (
            <img
              src={p.logo_url}
              alt={`Logo ${p.company_name}`}
              className="h-16 mx-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-16 w-16 mx-auto rounded-full bg-stone-900 text-amber-50 flex items-center justify-center text-2xl font-bold">
              {p.company_name?.[0] ?? "U"}
            </div>
          )}
          <Badge
            className={`gap-1.5 ${
              trust.level >= 3
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : trust.level === 2
                ? "bg-stone-900 text-amber-50 hover:bg-stone-900"
                : "bg-white text-stone-900 border border-stone-300 hover:bg-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> {trust.label}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: "#1c1917" }}>
            {p.company_name}
          </h1>
          <p className="text-lg" style={{ color: "#57534e" }}>
            {p.primary_trade} · {p.primary_city}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="rounded-full bg-stone-900 text-amber-50 px-4 py-1.5 text-sm font-semibold">
              Score AIPP {aippScore}/100
            </div>
            <div className="rounded-full bg-white border border-stone-300 px-4 py-1.5 text-sm" style={{ color: "#1c1917" }}>
              Confiance {trustScore}/100
            </div>
            {p.google_rating && (
              <div className="rounded-full bg-white border border-stone-300 px-4 py-1.5 text-sm flex items-center gap-1" style={{ color: "#1c1917" }}>
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {p.google_rating} Google
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button onClick={goBook} className="rounded-full bg-stone-900 hover:bg-stone-800 text-amber-50">
              Demander un rendez-vous
            </Button>
            <Button onClick={goVerify} variant="outline" className="rounded-full border-stone-400 text-stone-900 hover:bg-stone-100">
              Vérifier cette entreprise
            </Button>
            <Button onClick={goAnalyze} variant="outline" className="rounded-full border-stone-400 text-stone-900 hover:bg-stone-100">
              Analyser mes soumissions
            </Button>
          </div>
        </header>


        {/* AI SUMMARY */}
        <section className="aipp-summary">
          <Card className="bg-white/60 backdrop-blur border-stone-200">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">
                <Sparkles className="w-4 h-4" /> Résumé généré par UNPRO
              </div>
              <p className="text-lg leading-relaxed">{p.short_ai_summary}</p>
              {p.long_ai_summary && <p className="mt-4 text-stone-600 leading-relaxed">{p.long_ai_summary}</p>}
            </CardContent>
          </Card>
        </section>

        {/* VERIFIED DATA */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Données vérifiées
          </h2>
          <Card className="bg-white border-stone-200">
            <CardContent className="p-0 divide-y divide-stone-100">
              {validationRows.map((row) => {
                const status = validations?.[row.key] || "unverified";
                return (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {STATUS_ICON[status]}
                      <div>
                        <div className="font-medium">{row.label}</div>
                        {row.value && <div className="text-sm text-stone-500">{row.value}</div>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{STATUS_LABEL[status]}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* SERVICES */}
        {services.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" /> Services
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((s: any) => (
                <Card key={s.id} className="bg-white border-stone-200">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-lg">{s.service_name}</h3>
                      {s.is_primary && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Principal</Badge>}
                    </div>
                    {s.sub_services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.sub_services.map((sub: string) => (
                          <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                        ))}
                      </div>
                    )}
                    {s.problems_solved?.length > 0 && (
                      <p className="text-sm text-stone-600">
                        <strong>Résout : </strong>{s.problems_solved.join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-stone-500 pt-1">
                      {s.seasonality && <span>📅 {s.seasonality}</span>}
                      {s.urgency_capable && <span>⚡ Urgence possible</span>}
                      {s.avg_project_value_min > 0 && (
                        <span>💰 {s.avg_project_value_min}$–{s.avg_project_value_max}$</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* LOCATIONS */}
        {locations.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Zones desservies
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {locations.map((l: any) => (
                <Card key={l.id} className="bg-white border-stone-200">
                  <CardContent className="p-4">
                    <div className="font-semibold">{l.city}{l.region && <span className="text-stone-500 font-normal text-sm"> · {l.region}</span>}</div>
                    {l.local_content && <p className="text-sm text-stone-600 mt-1">{l.local_content}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* MEDIA */}
        {media.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Galerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {media.filter((m: any) => m.media_type === "image" || m.media_type === "photo").map((m: any) => (
                <img key={m.id} src={m.url} alt={m.alt_text || p.company_name} className="rounded-2xl aspect-square object-cover" loading="lazy" />
              ))}
            </div>
          </section>
        )}

        {/* REVIEWS */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" /> Avis clients
            </h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r: any) => (
                <Card key={r.id} className="bg-white border-stone-200">
                  <CardContent className="p-4">
                    {r.rating && <div className="text-amber-600 mb-1">{"★".repeat(Math.round(r.rating))}</div>}
                    {r.excerpt && <p className="text-sm">{r.excerpt}</p>}
                    {r.author_name && <p className="text-xs text-stone-500 mt-2">— {r.author_name}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* SCORE BREAKDOWN */}
        {scores && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Analyse AIPP</h2>
            <Card className="bg-white border-stone-200">
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Présence web", v: scores.web_presence_score },
                  { label: "Cohérence NAP", v: scores.nap_consistency_score },
                  { label: "Avis", v: scores.review_quality_score },
                  { label: "Photos", v: scores.media_score },
                  { label: "Autorité locale", v: scores.local_authority_score },
                  { label: "Structure IA", v: scores.structure_score },
                  { label: "Preuves", v: scores.proofs_score },
                  { label: "Spécialisation", v: scores.specialization_score },
                  { label: "Citabilité ChatGPT", v: scores.chatgpt_citability },
                  { label: "Citabilité Gemini", v: scores.gemini_citability },
                ].map(({ label, v }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold text-stone-900">{v ?? 0}<span className="text-sm text-stone-400 font-normal">/100</span></div>
                    <div className="text-xs text-stone-600 mt-1">{label}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* WHY UNPRO */}
        <section>
          <Card className="bg-stone-900 text-amber-50 border-stone-900">
            <CardContent className="p-6 md:p-8 space-y-3">
              <h2 className="text-2xl font-bold">Pourquoi UNPRO recommande ce profil</h2>
              <p className="text-stone-300">
                Profil compatible avec ce type de projet selon les données publiques disponibles.
                UNPRO ne classe pas les entreprises sur des affirmations non vérifiables.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-stone-900">
            <Sparkles className="w-5 h-5" /> Questions fréquentes
          </h2>
          <div className="space-y-2">
            {jsonLdStack[3].mainEntity.map((q: any, i: number) => (
              <details key={i} className="bg-white border border-stone-200 rounded-2xl px-5 py-3 group">
                <summary className="cursor-pointer font-semibold list-none flex items-center justify-between">
                  <span>{q.name}</span>
                  <span className="text-stone-400 group-open:rotate-45 transition">+</span>
                </summary>
                <p className="text-sm text-stone-600 mt-2">{q.acceptedAnswer.text}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Footer attribution */}
        <footer className="text-center text-xs text-stone-500 pt-8 border-t border-stone-200">
          Données structurées et résumé IA par <strong>UNPRO</strong>. Mises à jour automatiquement.
          {p.website_url && <> Source primaire : <a href={p.website_url} className="underline">{new URL(p.website_url).hostname}</a></>}
        </footer>
      </main>
    </div>
  );
}
