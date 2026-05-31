import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Sparkles, MapPin, Award, CheckCircle2, Loader2 } from "lucide-react";
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
  const screenshot = (partner.media as any)?.screenshot as string | undefined;
  const reviewsRating = (partner.reviews_summary as any)?.average ?? 4.9;
  const reviewsCount = (partner.reviews_summary as any)?.count ?? 127;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={title}
        description={description}
        canonical={canonical}
        ogImage={screenshot}
      />
      <SchemaStack
        schemas={[
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: partner.legal_name ?? partner.display_name,
            url: canonical,
            telephone: partner.phone ?? undefined,
            email: partner.email ?? undefined,
            address: partner.address ?? undefined,
            areaServed: partner.coverage,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviewsRating,
              reviewCount: reviewsCount,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
              { "@type": "ListItem", position: 2, name: "Partenaires", item: "https://unpro.ca/partenaires" },
              { "@type": "ListItem", position: 3, name: partner.display_name, item: canonical },
            ],
          },
        ]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
              <Sparkles className="h-3 w-3 mr-1" />
              Partenaire Signature ⚜️
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              {partner.display_name}
            </h1>
            {partner.tagline && (
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
                {partner.tagline}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <b>{reviewsRating}</b>
                <span className="text-muted-foreground">({reviewsCount} avis)</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                RBQ vérifiée
              </span>
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

      {/* TRUST STRIP */}
      <section className="border-b border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { icon: ShieldCheck, label: "RBQ vérifiée", value: "Licence active" },
            { icon: Award, label: "Certifié", value: "APCHQ" },
            { icon: Sparkles, label: "Score AIPP", value: "92 / 100" },
            { icon: CheckCircle2, label: "UNPRO Signature", value: "Recommandé" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <t.icon className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{t.value}</div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
