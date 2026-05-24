/**
 * UNPRO — AI Entity Profile
 * Route: /ai/:slug
 *
 * Knowledge-first page designed for AI crawlers (ChatGPT, Gemini, Perplexity)
 * and search engines. No funnel, no Alex, no auth overlay.
 * Conversion lives separately at /pro/:slug.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, Globe, MapPin, Star, ShieldCheck } from "lucide-react";

interface Entity {
  id: string;
  slug: string;
  company_name: string;
  primary_service: string | null;
  primary_city: string | null;
  ai_summary: string | null;
  confidence_score: number;
  years_active: number | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  updated_at: string;
}
interface Validation {
  rbq_status: string; rbq_number: string | null;
  neq_status: string; neq_number: string | null;
  insurance_status: string;
  google_verified: boolean; domain_https: boolean;
  recent_photos: boolean; recent_reviews: boolean;
}
interface Review { source: string; rating: number | null; review_count: number | null; themes: string[] | null; sentiment: any; }
interface Service { label: string; slug: string | null; frequency: string; evidence_url: string | null; image_url: string | null; }
interface Zone { city: string; region: string | null; }
interface Img { image_url: string; type: string; ai_caption: string | null; }
interface Faq { question: string; answer: string; }

type Data = {
  entity: Entity;
  validation: Validation | null;
  reviews: Review[];
  services: Service[];
  zones: Zone[];
  images: Img[];
  faq: Faq[];
} | null;

function statusLabel(status: string, okLabel: string, pendingLabel: string): { label: string; tone: "ok" | "pending" } | null {
  if (status === "confirmed") return { label: okLabel, tone: "ok" };
  if (status === "pending") return { label: pendingLabel, tone: "pending" };
  return null;
}

export default function PageAiEntity() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Data>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: entity, error: e1 } = await supabase
        .from("ai_entities").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (e1 || !entity) { if (!cancelled) { setError("Fiche introuvable"); setLoading(false); } return; }
      const [validation, reviews, services, zones, images, faq] = await Promise.all([
        supabase.from("ai_entity_validations").select("*").eq("entity_id", entity.id).maybeSingle(),
        supabase.from("ai_entity_reviews").select("*").eq("entity_id", entity.id),
        supabase.from("ai_entity_services").select("*").eq("entity_id", entity.id).order("sort_order"),
        supabase.from("ai_entity_zones").select("*").eq("entity_id", entity.id).order("sort_order"),
        supabase.from("ai_entity_images").select("*").eq("entity_id", entity.id).order("sort_order"),
        supabase.from("ai_entity_faq").select("*").eq("entity_id", entity.id).order("sort_order"),
      ]);
      if (cancelled) return;
      setData({
        entity: entity as Entity,
        validation: (validation.data as Validation | null) ?? null,
        reviews: (reviews.data as Review[]) ?? [],
        services: (services.data as Service[]) ?? [],
        zones: (zones.data as Zone[]) ?? [],
        images: (images.data as Img[]) ?? [],
        faq: (faq.data as Faq[]) ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const jsonLd = useMemo(() => {
    if (!data) return null;
    const { entity, validation, reviews, services, zones, faq } = data;
    const url = `https://unpro.ca/ai/${entity.slug}`;
    const totalReviews = reviews.reduce((s, r) => s + (r.review_count ?? 0), 0);
    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + (r.rating ?? 0) * (r.review_count ?? 1), 0) /
        Math.max(1, reviews.reduce((s, r) => s + (r.review_count ?? 1), 0))
      : null;
    const localBusiness: any = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": url,
      name: entity.company_name,
      url,
      ...(entity.website ? { sameAs: [entity.website] } : {}),
      ...(entity.logo_url ? { logo: entity.logo_url, image: entity.logo_url } : {}),
      ...(entity.phone ? { telephone: entity.phone } : {}),
      ...(entity.primary_city
        ? { address: { "@type": "PostalAddress", addressLocality: entity.primary_city, addressRegion: "QC", addressCountry: "CA" } }
        : {}),
      ...(entity.lat && entity.lng
        ? { geo: { "@type": "GeoCoordinates", latitude: entity.lat, longitude: entity.lng } }
        : {}),
      ...(zones.length ? { areaServed: zones.map(z => z.city) } : {}),
      ...(services.length ? { makesOffer: services.map(s => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.label } })) } : {}),
      ...(avgRating
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(avgRating.toFixed(2)), reviewCount: totalReviews } }
        : {}),
    };
    const faqSchema = faq.length ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    } : null;
    const breadcrumb = {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "UNPRO", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Entreprises analysées", item: "https://unpro.ca/ai" },
        { "@type": "ListItem", position: 3, name: entity.company_name, item: url },
      ],
    };
    return [localBusiness, faqSchema, breadcrumb].filter(Boolean);
  }, [data]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-700">Chargement…</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-700">Fiche introuvable.</div>;
  }

  const { entity, validation, reviews, services, zones, images, faq } = data;
  const url = `https://unpro.ca/ai/${entity.slug}`;
  const title = `${entity.company_name}${entity.primary_service ? ` — ${entity.primary_service}` : ""}${entity.primary_city ? ` à ${entity.primary_city}` : ""} | UNPRO`;
  const description = entity.ai_summary ?? `${entity.company_name} — entreprise analysée par UNPRO AI.`;

  const badges: { label: string; tone: "ok" | "pending" }[] = [];
  if (validation) {
    const rbq = statusLabel(validation.rbq_status, validation.rbq_number ? `RBQ validée #${validation.rbq_number}` : "RBQ validée", "Validation RBQ en cours");
    if (rbq) badges.push(rbq);
    const neq = statusLabel(validation.neq_status, validation.neq_number ? `NEQ active #${validation.neq_number}` : "NEQ active", "Vérification du registre en cours");
    if (neq) badges.push(neq);
    const ins = statusLabel(validation.insurance_status, "Assurance détectée", "Validation de l'assurance en cours");
    if (ins) badges.push(ins);
    if (validation.google_verified) badges.push({ label: "Google Business vérifié", tone: "ok" });
    if (validation.domain_https) badges.push({ label: "Site sécurisé HTTPS", tone: "ok" });
    if (validation.recent_reviews) badges.push({ label: "Avis récents détectés", tone: "ok" });
    if (validation.recent_photos) badges.push({ label: "Photos récentes détectées", tone: "ok" });
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="profile" />
        {entity.logo_url && <meta property="og:image" content={entity.logo_url} />}
        <meta name="robots" content="index,follow,max-image-preview:large" />
      </Helmet>
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <main className="max-w-4xl mx-auto px-5 py-10 md:py-16 space-y-12">
        {/* HERO */}
        <header className="space-y-4">
          <div className="flex items-start gap-4">
            {entity.logo_url && (
              <img src={entity.logo_url} alt={`Logo ${entity.company_name}`} className="w-16 h-16 rounded-xl object-contain bg-white border border-neutral-200 p-2" loading="eager" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{entity.company_name}</h1>
              <p className="mt-1 text-neutral-600">
                {entity.primary_service}{entity.primary_city ? ` • ${entity.primary_city}` : ""}
              </p>
              <p className="mt-2 text-sm text-neutral-500 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Entreprise analysée par UNPRO AI · Score {entity.confidence_score}/100
              </p>
            </div>
          </div>
        </header>

        {/* BADGES */}
        {badges.length > 0 && (
          <section aria-labelledby="badges-title">
            <h2 id="badges-title" className="text-lg font-semibold mb-3">Signaux de confiance</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <Badge key={i} variant="secondary" className={
                  b.tone === "ok"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }>
                  {b.tone === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
                  {b.label}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* RATINGS */}
        {reviews.length > 0 && (
          <section aria-labelledby="ratings-title">
            <h2 id="ratings-title" className="text-lg font-semibold mb-3">Notes publiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {reviews.map((r, i) => (
                <Card key={i} className="p-4">
                  <div className="text-sm text-neutral-600 capitalize">{r.source}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold">{r.rating?.toFixed(1) ?? "—"}</span>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="text-xs text-neutral-500">{r.review_count ?? 0} avis</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* RÉSUMÉ IA */}
        {entity.ai_summary && (
          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="text-lg font-semibold mb-3">Résumé UNPRO AI</h2>
            <Card className="p-5 leading-relaxed text-neutral-800">{entity.ai_summary}</Card>
          </section>
        )}

        {/* SERVICES */}
        {services.length > 0 && (
          <section aria-labelledby="services-title">
            <h2 id="services-title" className="text-lg font-semibold mb-3">Services détectés</h2>
            <div className="flex flex-wrap gap-2">
              {services.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {s.label}
                  {s.frequency === "high" && <span className="text-[10px] uppercase tracking-wide text-emerald-700">principal</span>}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ZONES */}
        {zones.length > 0 && (
          <section aria-labelledby="zones-title">
            <h2 id="zones-title" className="text-lg font-semibold mb-3">Zones desservies</h2>
            <div className="flex flex-wrap gap-2">
              {zones.map((z, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-800">
                  <MapPin className="w-3.5 h-3.5" /> {z.city}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* GALERIE */}
        {images.length > 1 && (
          <section aria-labelledby="gallery-title">
            <h2 id="gallery-title" className="text-lg font-semibold mb-3">Galerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img, i) => (
                <img key={i} src={img.image_url} alt={img.ai_caption ?? entity.company_name} className="w-full aspect-square object-cover rounded-xl border border-neutral-200" loading="lazy" />
              ))}
            </div>
          </section>
        )}

        {/* ANALYSE DES AVIS */}
        {reviews.some(r => r.themes && r.themes.length > 0) && (
          <section aria-labelledby="themes-title">
            <h2 id="themes-title" className="text-lg font-semibold mb-3">Thèmes récurrents dans les avis</h2>
            <ul className="list-disc pl-5 space-y-1 text-neutral-800">
              {Array.from(new Set(reviews.flatMap(r => r.themes ?? []))).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section aria-labelledby="faq-title">
            <h2 id="faq-title" className="text-lg font-semibold mb-3">Questions fréquentes</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <Card key={i} className="p-4">
                  <div className="font-medium">{f.question}</div>
                  <div className="mt-1 text-neutral-700">{f.answer}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* META */}
        <section className="text-sm text-neutral-500 border-t border-neutral-200 pt-6 space-y-2">
          {entity.website && (
            <p className="inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> <a href={entity.website} rel="nofollow noopener" target="_blank" className="underline">{entity.website.replace(/^https?:\/\//, "")}</a>
            </p>
          )}
          <p>Dernière mise à jour : {new Date(entity.updated_at).toLocaleDateString("fr-CA")}</p>
          <p>
            <Link to={`/pro/${entity.slug}`} className="text-neutral-700 underline">Prendre rendez-vous avec cette entreprise</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
