/**
 * UNPRO — Programmatic Verification SEO Page
 * /verifier-{trade}/{city} — Dynamic landing pages for verification intent.
 */

import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck, Search, AlertTriangle, CheckCircle, FileText,
  ArrowRight, Upload, Sparkles, MapPin, Info, ChevronRight,
} from "lucide-react";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import { SEO_CITIES, type SeoCity } from "@/seo/data/cities";
import {
  VERIFICATION_TRADES,
  generateVerificationFaqs,
  type VerificationTrade,
} from "@/seo/data/verificationTrades";
import { useState } from "react";

// ─── Helpers ───

function findTrade(slug: string): VerificationTrade | undefined {
  return VERIFICATION_TRADES.find((t) => t.slug === slug);
}

function findCity(slug: string): SeoCity | undefined {
  return SEO_CITIES.find((c) => c.slug === slug);
}

// ─── Section Components ───

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3">{children}</h2>
);

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-5 rounded-xl border border-border/30 bg-card/80 backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// ─── Page ───

const VerificationSeoPage = () => {
  const { tradeSlug, citySlug } = useParams<{ tradeSlug: string; citySlug: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const trade = findTrade(tradeSlug ?? "entrepreneur") ?? VERIFICATION_TRADES[0];
  const city = findCity(citySlug ?? "montreal") ?? SEO_CITIES[0];

  const faqs = useMemo(() => generateVerificationFaqs(city.name, trade), [city.name, trade]);

  const pageTitle = `Vérifier un ${trade.label} à ${city.name} | UnPRO`;
  const pageDesc = `Comment vérifier un ${trade.label} à ${city.name} ? RBQ, soumission, identité — UnPRO vous aide à valider les informations avant de signer.`;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/verifier-un-entrepreneur?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Internal links
  const nearbyLinks = city.nearbyCities.slice(0, 5).map((slug) => {
    const c = findCity(slug);
    return { to: `/verifier-${trade.slug}/${slug}`, label: `Vérifier un ${trade.label} à ${c?.name ?? slug}` };
  });

  const tradeLinks = VERIFICATION_TRADES
    .filter((t) => t.slug !== trade.slug)
    .slice(0, 4)
    .map((t) => ({ to: `/verifier-${t.slug}/${city.slug}`, label: `Vérifier un ${t.label} à ${city.name}` }));

  return (
    <MainLayout>
      <SeoHead title={pageTitle} description={pageDesc} canonical={`https://unpro.ca/verifier-${trade.slug}/${city.slug}`} />

      <div className="min-h-screen bg-background">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-14">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="mb-3 text-xs border-primary/20 text-primary">
                <ShieldCheck className="w-3 h-3 mr-1" /> Vérification · {city.name}
              </Badge>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Vérifiez un {trade.label} à {city.name}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                RBQ, numéro de téléphone, site web ou soumission — UnPRO vous aide à relier
                les bonnes informations pour un {trade.label} à {city.name} sans rien inventer.
              </p>

              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder={`Nom, téléphone ou RBQ du ${trade.label}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-1.5" /> Vérifier
                </Button>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link to="/analyser-document">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Analyser une soumission
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
          {/* ─── 1. Why verification matters in {city} ─── */}
          <section>
            <SectionHeading>Pourquoi vérifier un {trade.label} à {city.name} ?</SectionHeading>
            <GlassCard>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                À {city.name}, le parc immobilier est varié : {city.housingHints.toLowerCase()}{" "}
                Cela signifie que les besoins en {trade.name_plural.toLowerCase()} sont spécifiques
                et qu'il est important de s'assurer que le professionnel choisi possède l'expérience
                et les qualifications adaptées.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Avec les conditions climatiques de la région ({city.climateTags.join(", ")}),
                les travaux mal exécutés peuvent avoir des conséquences coûteuses. Vérifier avant
                de signer est une précaution essentielle.
              </p>
            </GlassCard>
          </section>

          {/* ─── 2. Typical risks ─── */}
          <section>
            <SectionHeading>Risques courants pour les propriétaires</SectionHeading>
            <div className="space-y-2">
              {trade.risks_fr.map((risk, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{risk}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── 3. What UnPRO verifies ─── */}
          <section>
            <SectionHeading>Ce que UnPRO vérifie</SectionHeading>
            <GlassCard>
              <div className="space-y-2.5">
                {trade.what_unpro_checks_fr.map((check, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{check}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                UnPRO ne fabrique pas d'informations absentes et ne remplace pas une vérification légale officielle.
              </p>
            </GlassCard>
          </section>

          {/* ─── 4. Common mistakes ─── */}
          <section>
            <SectionHeading>Erreurs fréquentes lors du choix d'un {trade.label}</SectionHeading>
            <div className="grid gap-2">
              {trade.common_mistakes_fr.map((mistake, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </span>
                  <span className="text-sm text-foreground">{mistake}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── 5. FAQ ─── */}
          <SeoFaqSection faqs={faqs} heading={`Questions fréquentes — ${trade.name} à ${city.name}`} />

          {/* ─── 6. CTA ─── */}
          <section className="space-y-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5">
              <CardContent className="p-5 text-center">
                <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-display text-base font-bold mb-2">
                  Prêt à vérifier un {trade.label} à {city.name} ?
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Entrez un nom, un numéro de téléphone ou un RBQ pour commencer.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild>
                    <Link to="/verifier-un-entrepreneur">
                      <Search className="w-4 h-4 mr-1.5" /> Vérifier un {trade.label}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/analyser-document">
                      <FileText className="w-4 h-4 mr-1.5" /> Analyser une soumission
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/alex">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Parler à Alex pour de l'aide
                </Link>
              </Button>
            </div>
          </section>

          {/* ─── Internal Links ─── */}
          <div className="space-y-6 border-t border-border/30 pt-8">
            <SeoInternalLinks
              heading={`Vérification dans les villes voisines`}
              links={nearbyLinks}
            />
            <SeoInternalLinks
              heading={`Autres types de vérification à ${city.name}`}
              links={tradeLinks}
            />
            <SeoInternalLinks
              heading="Pages connexes"
              links={[
                { to: "/verifier-entrepreneur", label: "Vérifier un entrepreneur au Québec" },
                { to: `/ville/${city.slug}`, label: `Entrepreneurs à ${city.name}` },
                ...trade.related_services.slice(0, 3).map((s) => ({
                  to: `/services/${s}/${city.slug}`,
                  label: `${s.replace(/-/g, " ")} à ${city.name}`,
                })),
              ]}
            />
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
            Les informations sur cette page sont fournies à titre indicatif. UnPRO ne remplace
            pas une vérification légale officielle auprès de la RBQ ou d'un conseiller juridique.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default VerificationSeoPage;
