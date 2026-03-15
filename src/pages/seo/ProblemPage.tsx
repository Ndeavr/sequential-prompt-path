/**
 * UNPRO — Problem SEO Page (Premium Design)
 * /probleme/:slug — DB-backed problem detail with structured data
 */

import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoCta from "@/seo/components/SeoCta";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import SeoInternalLinks from "@/seo/components/SeoInternalLinks";
import GrowthCtaBlock from "@/components/growth/GrowthCtaBlock";
import ContractorLandingCta from "@/components/growth/ContractorLandingCta";
import { useHomeProblem, useProblemSolutions, useProblemImages } from "@/hooks/useKnowledgeGraph";
import { getProblemBySlug } from "@/seo/data/problems";
import { SEO_CITIES } from "@/seo/data/cities";
import {
  AlertTriangle, CheckCircle, Eye, ShieldAlert, Shield, DollarSign,
  Star, ArrowRight, Wrench, MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const urgencyColor: Record<string, string> = {
  low: "bg-secondary/10 text-secondary",
  medium: "bg-accent/10 text-accent-foreground",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const urgencyLabel: Record<string, string> = {
  low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const WaveDivider = () => (
  <div className="wave-divider">
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
      <path d="M0 24C240 0 480 48 720 24C960 0 1200 48 1440 24V48H0Z" fill="hsl(var(--background))" />
    </svg>
  </div>
);

const ProblemPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: dbProblem, isLoading } = useHomeProblem(slug);
  const { data: solutions } = useProblemSolutions(dbProblem?.id);
  const { data: images } = useProblemImages(dbProblem?.id);

  // Fallback to static SEO data
  const staticProblem = slug ? getProblemBySlug(slug) : undefined;

  // Use DB data as primary, static as fallback for SEO fields
  const problem = dbProblem;
  const sp = staticProblem;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-5 py-12 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  // If neither DB nor static data found
  if (!problem && !sp) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-5 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Problème non trouvé</h1>
          <Link to="/problemes" className="text-primary underline mt-4 inline-block">Voir tous les problèmes</Link>
        </div>
      </MainLayout>
    );
  }

  const name = problem?.name_fr ?? sp?.name ?? "";
  const description = problem?.description_fr ?? sp?.shortDescription ?? "";
  const costLow = problem?.cost_estimate_low ?? sp?.costEstimate.low ?? 0;
  const costHigh = problem?.cost_estimate_high ?? sp?.costEstimate.high ?? 0;
  const urgency = sp?.urgency ?? "medium";
  const symptoms = sp?.symptoms ?? [];
  const causes = (problem?.typical_causes as string[] | null) ?? sp?.commonCauses ?? [];
  const risks = sp?.risks ?? [];
  const whatToCheck = sp?.whatToCheck ?? [];
  const contractorTypes = sp?.contractorTypes ?? [problem?.professional_category].filter(Boolean) as string[];
  const urgencyScore = problem?.urgency_score ?? (urgency === "critical" ? 10 : urgency === "high" ? 8 : urgency === "medium" ? 5 : 3);
  const fmt = (n: number) => n.toLocaleString("fr-CA");

  // Build FAQs
  const faqs = [
    { question: `Combien coûte la résolution de « ${name} » ?`, answer: `Le coût estimé se situe entre ${fmt(costLow)}$ et ${fmt(costHigh)}$ selon la sévérité et la complexité du problème.`, topics: ["general"] },
    { question: `Quel professionnel contacter pour ce problème ?`, answer: `Un spécialiste en ${contractorTypes.join(" ou ")} est recommandé pour diagnostiquer et résoudre ce problème.`, topics: ["general"] },
    { question: `Est-ce un problème urgent ?`, answer: urgencyScore >= 8 ? "Oui, une intervention rapide est fortement recommandée pour éviter des dommages supplémentaires." : urgencyScore >= 5 ? "Ce problème devrait être traité dans un délai raisonnable pour éviter une aggravation." : "Ce problème peut être planifié dans le cadre de l'entretien régulier de votre propriété.", topics: ["general"] },
    { question: `Puis-je identifier ce problème moi-même ?`, answer: `Certains signes sont visibles (${symptoms.slice(0, 2).join(", ")}). Cependant, un diagnostic professionnel est recommandé pour confirmer l'étendue du problème et choisir la bonne solution.`, topics: ["general"] },
  ];

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    estimatedCost: costLow && costHigh ? { "@type": "MonetaryAmount", currency: "CAD", minValue: costLow, maxValue: costHigh } : undefined,
    step: (solutions ?? []).map((edge: any, i: number) => ({
      "@type": "HowToStep", position: i + 1,
      name: edge.home_solutions?.name_fr ?? `Étape ${i + 1}`,
      text: edge.home_solutions?.description_fr ?? "",
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  // City links for this problem
  const nearbyCityLinks = SEO_CITIES.slice(0, 8).map((c) => ({
    to: `/probleme/${slug}/${c.slug}`,
    label: `${name} à ${c.name}`,
  }));

  // Related problems
  const relatedProblemLinks = (sp?.relatedProblems ?? []).map((rp) => ({
    to: `/probleme/${rp}`,
    label: getProblemBySlug(rp)?.name ?? rp,
  }));

  return (
    <MainLayout>
      <SeoHead
        title={`${name} — Causes, solutions et coûts | UNPRO`}
        description={description.slice(0, 155)}
      />

      <article className="premium-bg">
        {/* Hero */}
        <div className="relative hero-gradient noise-overlay overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto px-5 pt-8 pb-20 md:pt-12 md:pb-28 space-y-5">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
              <span className="text-border">/</span>
              <Link to="/problemes" className="hover:text-primary transition-colors">Problèmes</Link>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium truncate">{name}</span>
            </nav>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-2xl md:text-[2.5rem] font-extrabold text-foreground leading-tight tracking-[-0.02em]">
                  {name}
                </h1>
                <Badge className={`${urgencyColor[urgency] ?? ""} rounded-full mt-1`}>
                  Urgence : {urgencyLabel[urgency]}
                </Badge>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">{description}</p>
            </motion.div>
          </div>
          <WaveDivider />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 space-y-8 pb-12">
          {/* Images */}
          {images && images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 -mt-8">
              {images.slice(0, 4).map((img: any) => (
                <img key={img.id} src={img.image_url} alt={img.alt_text_fr || name} className="rounded-xl w-full object-cover h-32 sm:h-40" loading="lazy" />
              ))}
            </div>
          )}

          {/* Problem / Solution cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-10">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="glass-card border-0 shadow-md h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Symptômes</h2>
                  </div>
                  <ul className="space-y-2">
                    {symptoms.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                        <span className="mt-1 h-1 w-1 rounded-full bg-destructive shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card className="glass-card border-0 shadow-md h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Quoi vérifier</h2>
                  </div>
                  <ul className="space-y-2">
                    {whatToCheck.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                        <span className="mt-1 h-1 w-1 rounded-full bg-success shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Cost Estimate */}
          <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-soft">
            <CardContent className="p-5">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Estimation des coûts
              </h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-foreground">{fmt(costLow)} $ — {fmt(costHigh)} $</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Coût moyen pour résoudre ce problème au Québec. Le prix varie selon la gravité, l'accessibilité et les matériaux requis.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Conseil UNPRO :</strong> Obtenez 3 soumissions détaillées et utilisez notre analyse IA gratuite pour comparer les prix au marché local.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Causes */}
          {causes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" /> Causes fréquentes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {causes.map((c, i) => (
                  <Card key={i} className="glass-card border-0 shadow-xs">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">{c}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <Card className="glass-card border-0 shadow-sm border-l-4 border-l-destructive/30">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" /> Risques si non traité
                </h2>
                <ul className="space-y-2">
                  {risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-destructive font-bold mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Solutions from DB */}
          {solutions && solutions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Solutions recommandées
              </h2>
              <div className="space-y-2">
                {solutions.map((edge: any) => {
                  const sol = edge.home_solutions;
                  if (!sol) return null;
                  return (
                    <Card key={edge.id} className="glass-card border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{sol.name_fr}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{sol.description_fr}</p>
                            {sol.cost_estimate_low && sol.cost_estimate_high && (
                              <p className="text-xs text-primary mt-1">{sol.cost_estimate_low.toLocaleString("fr-CA")}$ – {sol.cost_estimate_high.toLocaleString("fr-CA")}$</p>
                            )}
                          </div>
                          <Link to={`/solution/${sol.slug}`} className="text-primary hover:text-primary/80 shrink-0">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                        {edge.is_primary && <Badge className="mt-2 text-[10px]">Solution principale</Badge>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Professional Recommendation */}
          <Card className="border-0 glass-card-elevated shadow-soft">
            <CardContent className="p-5">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Professionnel recommandé
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Pour résoudre ce problème, consultez un{" "}
                {contractorTypes.map((t, i) => (
                  <span key={t}>
                    {i > 0 && (i === contractorTypes.length - 1 ? " ou " : ", ")}
                    <strong className="text-foreground">{t}</strong>
                  </span>
                ))}
                {" "}vérifié.
              </p>
              <Button asChild size="sm">
                <Link to={`/search?specialty=${encodeURIComponent(contractorTypes[0] ?? "")}`}>
                  Trouver un professionnel <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Explore by city */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Ce problème par ville
            </h2>
            <div className="flex flex-wrap gap-2">
              {SEO_CITIES.slice(0, 12).map((city) => (
                <Link key={city.slug} to={`/probleme/${slug}/${city.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary/5 cursor-pointer text-xs">
                    {name} à {city.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>

          {/* Growth CTAs */}
          <GrowthCtaBlock showAlex />

          {/* FAQ */}
          <SeoFaqSection faqs={faqs} />

          {/* Internal links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedProblemLinks.length > 0 && (
              <SeoInternalLinks heading="Problèmes connexes" links={relatedProblemLinks} />
            )}
            <SeoInternalLinks heading="Même problème dans d'autres villes" links={nearbyCityLinks} />
          </div>

          {/* Contractor CTA */}
          <ContractorLandingCta />
        </div>
      </article>

      {/* JSON-LD injection */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </MainLayout>
  );
};

export default ProblemPage;
