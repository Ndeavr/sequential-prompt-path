import { useParams, Navigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Sparkles, MapPin, Award, CheckCircle2, Loader2, X } from "lucide-react";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { useSignaturePartner } from "@/features/partners/hooks/useSignaturePartner";
import SignaturePartnerBookingWidget from "@/features/partners/components/SignaturePartnerBookingWidget";
import { Badge } from "@/components/ui/badge";

interface Props {
  slug?: string; // optional override for hard-coded routes
}

export default function PageSignaturePartner({ slug: slugProp }: Props) {
  const params = useParams<{ slug: string }>();
  const slug = slugProp ?? params.slug ?? "";
  const { data: partner, isLoading } = useSignaturePartner(slug);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!partner) return <Navigate to="/" replace />;

  const canonical = `https://unpro.ca/${partner.slug}`;
  const title = `${partner.display_name} — Partenaire Signature UNPRO`;
  const description = `${partner.tagline ?? partner.display_name}. Partenaire Signature UNPRO vérifié. Réservation directe en ligne, aucune soumission requise.`;
  const media = (partner.media ?? {}) as Record<string, any>;
  const logoUrl = media.logo_url as string | undefined;
  const heroUrl = media.hero_url as string | undefined;
  const gallery = (media.gallery ?? []) as string[];
  const ogImage = heroUrl ?? logoUrl ?? (media.screenshot as string | undefined);
  const brand = (partner.brand ?? {}) as Record<string, any>;
  const materialLabel = brand.material_label as string | undefined;
  const reviewsRating = (partner.reviews_summary as any)?.average as number | undefined;
  const reviewsCount = (partner.reviews_summary as any)?.count as number | undefined;
  const reviewsSource = (partner.reviews_summary as any)?.source as string | undefined;
  const rbqCert = (partner.certifications ?? []).find((c) => /RBQ/i.test(c.label));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={title}
        description={description}
        canonical={canonical}
        ogImage={ogImage}
      />
      <SchemaStack
        breadcrumbs={[
          { name: "Accueil", url: "https://unpro.ca" },
          { name: "Partenaires", url: "https://unpro.ca/partenaires" },
          { name: partner.display_name, url: canonical },
        ]}
        localBusiness={{
          name: partner.legal_name ?? partner.display_name,
          url: canonical,
          city: partner.coverage?.[0] ?? "Montréal",
          region: "QC",
          areaServed: partner.coverage,
          serviceType: (partner.services ?? []).map((s) => s.name),
          ...(reviewsRating && reviewsCount
            ? { rating: { value: reviewsRating, count: reviewsCount } }
            : {}),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        {heroUrl ? (
          <div className="absolute inset-0 -z-10">
            <img src={heroUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-background/70" />
          </div>
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
        )}
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`Logo ${partner.display_name}`}
                  className="h-14 w-auto object-contain bg-white rounded-[14px] p-2 border border-border/60"
                />
              )}
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
                <Sparkles className="h-3 w-3 mr-1" />
                Partenaire Signature ⚜️
              </Badge>
              {materialLabel && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
                  {materialLabel}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              {partner.display_name}
            </h1>
            {partner.tagline && (
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
                {partner.tagline}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              {reviewsRating && reviewsCount && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <b>{reviewsRating}</b>
                  <span className="text-muted-foreground">
                    ({reviewsCount} avis{reviewsSource ? ` ${reviewsSource}` : ""})
                  </span>
                </span>
              )}
              {rbqCert && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {rbqCert.label}
                </span>
              )}
              {partner.coverage?.length > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {partner.coverage.slice(0, 3).join(" · ")}
                </span>
              )}
            </div>
            <div className="mt-8">
              <a
                href="#reserver"
                className="inline-flex items-center justify-center px-6 h-12 rounded-[18px] bg-primary text-primary-foreground font-medium hover:-translate-y-0.5 transition-transform"
              >
                Réserver maintenant
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP — only real, verified signals */}
      <section className="border-b border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {rbqCert && (
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{rbqCert.label}</div>
                <div className="text-xs text-muted-foreground">Licence active</div>
              </div>
            </div>
          )}
          {(partner.certifications ?? [])
            .filter((c) => !/RBQ/i.test(c.label))
            .slice(0, 2)
            .map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">Vérifié UNPRO</div>
                </div>
              </div>
            ))}
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Recommandé</div>
              <div className="text-xs text-muted-foreground">UNPRO Signature</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight mb-8">Services & spécialités</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(partner.services ?? []).map((s) => (
            <div key={s.name} className="rounded-[28px] border border-border/60 bg-card p-6 hover:-translate-y-0.5 transition-transform">
              <h3 className="text-xl font-semibold mb-2">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      {gallery.length > 0 && (() => {
        const galleryVerified = (media as any).gallery_verified === true;
        return (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Réalisations récentes</h2>
          {!galleryVerified && (
            <p className="text-xs text-muted-foreground mb-6">
              Exemples illustratifs — vraies réalisations en cours d'ajout.
            </p>
          )}
          {galleryVerified && <div className="mb-6" />}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => galleryVerified && setLightbox(src)}
                className={`group relative aspect-[4/3] overflow-hidden rounded-[18px] border border-border/60 bg-card ${galleryVerified ? "" : "cursor-default"}`}
              >
                <img
                  src={src}
                  alt={`Réalisation ${i + 1} ${partner.display_name}`}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-500 ${galleryVerified ? "group-hover:scale-105" : ""}`}
                />
                {!galleryVerified && (
                  <>
                    <div className="absolute inset-0 bg-black/45" />
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/40 text-xs font-medium backdrop-blur-sm">
                        Photos à venir
                      </span>
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
        );
      })()}

      {/* COVERAGE */}
      {partner.coverage?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Zones desservies</h2>
          <div className="flex flex-wrap gap-2">
            {partner.coverage.map((c) => (
              <span key={c} className="px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm">
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* CERTIFICATIONS */}
      {partner.certifications?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Certifications & garanties</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {partner.certifications.map((c) => (
              <div key={c.label} className="flex items-center gap-3 p-4 rounded-[18px] border border-border/60 bg-card">
                <Award className={`h-5 w-5 ${c.verified ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span className="font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BOOKING */}
      <section id="reserver" className="max-w-3xl mx-auto px-4 pb-24 scroll-mt-20">
        <SignaturePartnerBookingWidget partner={partner} />
      </section>

      {/* WHY SIGNATURE */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
            Pourquoi un Partenaire Signature ?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            UNPRO ne joue pas au comparateur de soumissions. Nous recommandons <b>un seul</b> partenaire,
            vérifié, scoré et engagé par contrat de qualité. Vous gagnez du temps, vous évitez les erreurs,
            vous obtenez la bonne réponse du premier coup.
          </p>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-[18px]" />
        </div>
      )}
    </div>
  );
}
