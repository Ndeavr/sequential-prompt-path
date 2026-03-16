/**
 * UNPRO — Public Contractor Profile Page (V2)
 * 13 sections: Hero, AI Summary, Why Recommend, Considerations, Services,
 * Problems, Zones, Proofs, AIPP, Reviews+AI, FAQ, Comparables, Sticky CTA.
 * SEO-ready (JSON-LD), LLM-ready, mobile premium, graceful fallbacks.
 */

import { useParams, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import ScoreRing from "@/components/ui/score-ring";
import SeoHead from "@/seo/components/SeoHead";
import {
  ArrowLeft, MapPin, Star, ShieldCheck, Clock,
  CalendarPlus, ArrowRight, Award, Zap, Brain,
  CheckCircle, Phone, Globe, Mail, Briefcase,
  Camera, ThumbsUp, AlertTriangle, TrendingUp,
  ChevronRight, Sparkles, Shield, Users,
  Wrench, HelpCircle, MessageSquare, Map,
  FileCheck, Eye, Lock, ChevronDown,
} from "lucide-react";
import {
  useContractorFullProfile,
  useContractorAIPPBreakdown,
  useContractorReviewDimensions,
  useContractorReviewAggregate,
} from "@/hooks/useContractorPublicPage";
import {
  usePublicContractorReviews,
} from "@/hooks/usePublicContractors";
import { useContractorPublicScores, useReviewInsights } from "@/hooks/useMatchingEngine";
import { UnproVerifiedBadge } from "@/components/contractor/UnproVerifiedBadge";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useState } from "react";
import heroHouse from "@/assets/hero-house.jpg";
import WhyThisContractorIsRecommended from "@/components/contractor/WhyThisContractorIsRecommended";

/* ── Demo / fallback contractor data for carousel "Voir profil" ── */
const DEMO_CONTRACTORS: Record<string, any> = {
  "1": {
    id: "1", business_name: "TOITURE EXPERT", specialty: "Toiture & Couverture", city: "Montréal", province: "QC",
    aipp_score: 92, rating: 4.9, review_count: 47, years_experience: 18, verification_status: "verified", admin_verified: true,
    description: "Spécialistes en toiture résidentielle et commerciale depuis 2006. Expertise en bardeaux d'asphalte, toiture métallique et membrane élastomère. Service d'urgence 24h disponible.",
    phone: "(514) 555-0101", email: "info@toiture-expert.ca", website: "https://toiture-expert.ca",
    address: "1234 Rue Saint-Denis", postal_code: "H2J 2L1",
    logo_url: null,
  },
  "2": {
    id: "2", business_name: "PLOMBERIE PRO", specialty: "Plomberie", city: "Laval", province: "QC",
    aipp_score: 88, rating: 4.8, review_count: 34, years_experience: 12, verification_status: "verified", admin_verified: true,
    description: "Service de plomberie résidentielle complet : réparations, installations, débouchage et rénovation de salles de bain. Détenteur de licence RBQ.",
    phone: "(450) 555-0202", email: "contact@plomberie-pro.ca", website: "https://plomberie-pro.ca",
    address: "567 Boul. des Laurentides", postal_code: "H7G 2T8",
    logo_url: null,
  },
  "3": {
    id: "3", business_name: "RÉNO MAÎTRE", specialty: "Rénovation générale", city: "Québec", province: "QC",
    aipp_score: 85, rating: 4.7, review_count: 29, years_experience: 15, verification_status: "verified", admin_verified: true,
    description: "Entrepreneur général spécialisé en rénovation résidentielle haut de gamme. Cuisines, salles de bain, sous-sols et agrandissements. Estimation gratuite.",
    phone: "(418) 555-0303", email: "info@renomaster.ca", website: "https://renomaster.ca",
    address: "890 Chemin Sainte-Foy", postal_code: "G1S 2L3",
    logo_url: null,
  },
  "4": {
    id: "4", business_name: "ÉLECTRO PLUS", specialty: "Électricité", city: "Gatineau", province: "QC",
    aipp_score: 90, rating: 4.9, review_count: 52, years_experience: 20, verification_status: "verified", admin_verified: true,
    description: "Maître-électricien certifié. Panneaux électriques, éclairage, bornes de recharge VÉ, domotique et mise aux normes. Résidentiel et commercial.",
    phone: "(819) 555-0404", email: "info@electro-plus.ca", website: "https://electro-plus.ca",
    address: "234 Boul. Maloney", postal_code: "J8T 5R4",
    logo_url: null,
  },
  "5": {
    id: "5", business_name: "CUISINE DESIGN", specialty: "Ébénisterie", city: "Sherbrooke", province: "QC",
    aipp_score: 87, rating: 4.6, review_count: 23, years_experience: 10, verification_status: "verified", admin_verified: true,
    description: "Fabrication et installation d'armoires de cuisine sur mesure. Design contemporain et classique. Comptoirs en quartz, granit et bois massif. Showroom disponible sur rendez-vous.",
    phone: "(819) 555-0505", email: "info@cuisine-design.ca", website: "https://cuisine-design.ca",
    address: "456 Rue King Ouest", postal_code: "J1H 1R4",
    logo_url: null,
  },
};

const DEMO_AIPP_BREAKDOWN = (score: number) => ({
  total_score: score,
  is_current: true,
  identity_score: Math.round(score * 0.2),
  trust_score: Math.round(score * 0.19),
  visibility_score: Math.round(score * 0.18),
  conversion_score: Math.round(score * 0.22),
  ai_seo_readiness_score: Math.round(score * 0.21),
});

const DEMO_REVIEWS = (name: string) => [
  { id: "r1", rating: 5, comment: `${name} a fait un travail exceptionnel. Très professionnel, respectueux des délais et du budget. Je recommande sans hésitation.`, reviewer_name: "Martin L.", created_at: "2026-01-15", work_quality: 5, communication: 5, professionalism: 5, schedule: 5, budget: 5, cleanliness: 4 },
  { id: "r2", rating: 5, comment: "Excellent service du début à la fin. Communication claire et résultat impeccable.", reviewer_name: "Sophie B.", created_at: "2025-11-20", work_quality: 5, communication: 5, professionalism: 5, schedule: 4, budget: 5, cleanliness: 5 },
  { id: "r3", rating: 4, comment: "Bon travail dans l'ensemble. Quelques jours de retard mais le résultat final est de qualité.", reviewer_name: "Jean-François D.", created_at: "2025-09-08", work_quality: 5, communication: 4, professionalism: 4, schedule: 3, budget: 4, cleanliness: 4 },
  { id: "r4", rating: 5, comment: "Très satisfait ! L'équipe est arrivée à l'heure, a protégé nos meubles et a laissé le chantier propre.", reviewer_name: "Isabelle T.", created_at: "2025-07-22", work_quality: 5, communication: 5, professionalism: 5, schedule: 5, budget: 5, cleanliness: 5 },
];

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

/* ── Helpers ── */
const getAIPPTier = (score: number) => {
  if (score >= 90) return { label: "Élite", color: "text-primary", bg: "bg-primary/10" };
  if (score >= 75) return { label: "Autorité", color: "text-success", bg: "bg-success/10" };
  if (score >= 60) return { label: "Gold", color: "text-warning", bg: "bg-warning/10" };
  if (score >= 40) return { label: "Silver", color: "text-muted-foreground", bg: "bg-muted" };
  return { label: "Bronze", color: "text-muted-foreground", bg: "bg-muted" };
};

const getConfidenceColor = (label: string) => {
  if (label === "high" || label === "élevée") return "bg-success/10 text-success";
  if (label === "moderate" || label === "modérée") return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
};

const AIPP_PILLARS = [
  { key: "identity_score", label: "Identité", icon: Briefcase, max: 20 },
  { key: "trust_score", label: "Confiance", icon: Shield, max: 20 },
  { key: "visibility_score", label: "Visibilité", icon: TrendingUp, max: 20 },
  { key: "conversion_score", label: "Conversion", icon: Users, max: 20 },
  { key: "ai_seo_readiness_score", label: "IA & SEO", icon: Sparkles, max: 20 },
];

const REVIEW_DIMENSION_LABELS: Record<string, string> = {
  work_quality: "Qualité du travail",
  cleanliness: "Propreté",
  communication: "Communication",
  schedule: "Respect des délais",
  budget: "Respect du budget",
  professionalism: "Professionnalisme",
};

const buildFallbackFAQ = (name: string, specialty: string | null, city: string | null) => [
  { q: `${name} est-elle une entreprise vérifiée sur UNPRO ?`, a: `Le profil de ${name} est affiché sur UNPRO. Les badges de vérification sont attribués après validation administrative des licences, assurances et identité.` },
  { q: `Quels services offre ${name} ?`, a: `${name} se spécialise en ${specialty || "services de construction"} dans la région de ${city || "Québec"}. Consultez la section Services pour le détail.` },
  { q: `Comment prendre rendez-vous ?`, a: `Cliquez sur « Prendre rendez-vous » depuis cette page ou parlez avec Alex, notre assistant IA.` },
  { q: `Qu'est-ce que le score AIPP ?`, a: `Le score AIPP évalue la crédibilité, la visibilité et la qualité d'un entrepreneur sur 100 points répartis en 5 piliers.` },
];

/* ══════════════════════════════════════════════════════════════ */

const ContractorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: profileData, isLoading, isError } = useContractorFullProfile(id);
  const { data: reviews } = usePublicContractorReviews(id);
  const { data: publicScores } = useContractorPublicScores(id);
  const { data: reviewInsights } = useReviewInsights(id);
  const { user, role } = useAuth();

  const contractor = profileData?.contractor ?? profileData;
  const contractorId = contractor?.id;

  const { data: aippBreakdown } = useContractorAIPPBreakdown(contractorId);
  const { data: reviewDimensions } = useContractorReviewDimensions(contractorId);
  const { data: reviewAggregate } = useContractorReviewAggregate(contractorId);

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Chargement du profil…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* ── Not found ── */
  if (isError || !contractor) {
    return (
      <MainLayout>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Briefcase className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Entrepreneur introuvable</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Ce profil n'existe pas ou n'est pas encore publié sur UNPRO.
          </p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/search">Retour à la recherche</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  /* ── Derived data ── */
  const isAdminVerified = contractor.admin_verified === true;
  const isVerified = isAdminVerified || contractor.verification_status === "verified";
  const isHomeowner = !!user && role === "homeowner";
  const isAuthenticated = !!user;
  const yearsExp = contractor.years_experience;

  const aiProfile = profileData?.ai_profile ?? null;
  const enrichedServices: any[] = profileData?.services ?? [];
  const enrichedAreas: any[] = profileData?.service_areas ?? [];
  const enrichedMedia: any[] = profileData?.media ?? [];
  const enrichedCredentials: any[] = profileData?.credentials ?? [];
  const enrichedProblems: any[] = profileData?.problem_links ?? [];
  const enrichedComparables: any[] = profileData?.comparables ?? [];
  const publicPage = profileData?.public_page ?? null;

  const aippScore = aippBreakdown?.total_score ?? contractor.aipp_score ?? publicScores?.aipp_score ?? null;
  const aippValidated = aippBreakdown != null && aippBreakdown.is_current;
  const tier = aippScore && aippScore > 0 ? getAIPPTier(aippScore) : null;

  const unproScore = publicScores?.unpro_score ?? null;
  const trustScore = publicScores?.trust_score ?? null;

  const reviewConfidence = (reviewInsights as any)?.confidence_level ?? null;
  const topPositiveThemes: string[] = (reviewInsights as any)?.top_positive_themes ?? [];
  const topNegativeThemes: string[] = (reviewInsights as any)?.top_negative_themes ?? [];
  const overallSentiment = (reviewInsights as any)?.overall_sentiment_score ?? null;

  const primaryServices = enrichedServices.filter((s: any) => s.is_primary);
  const secondaryServices = enrichedServices.filter((s: any) => !s.is_primary);
  const primaryArea = enrichedAreas.find((a: any) => a.is_primary);

  const initials = contractor.business_name?.slice(0, 2).toUpperCase() ?? "??";

  // FAQ from public_page or fallback
  const dbFaqs: Array<{ q: string; a: string }> = publicPage?.faq
    ? (Array.isArray(publicPage.faq) ? publicPage.faq : [])
    : [];
  const faqs = dbFaqs.length > 0 ? dbFaqs : buildFallbackFAQ(contractor.business_name, contractor.specialty, contractor.city);

  /* ── SEO ── */
  const seoTitle = `${contractor.business_name} — ${contractor.specialty || "Entrepreneur"} à ${contractor.city || "Québec"} | UNPRO`;
  const seoDescription = `Profil${isVerified ? " vérifié" : ""} de ${contractor.business_name}. ${contractor.specialty || "Services professionnels"} à ${contractor.city || "Québec"}.${aippValidated ? ` Score AIPP ${aippScore}/100.` : ""} Avis, services, rendez-vous.`;

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: contractor.business_name,
    description: contractor.description || seoDescription,
    address: {
      "@type": "PostalAddress",
      addressLocality: contractor.city || "",
      addressRegion: contractor.province || "QC",
      postalCode: contractor.postal_code || "",
      streetAddress: contractor.address || "",
      addressCountry: "CA",
    },
    ...(contractor.phone && { telephone: contractor.phone }),
    ...(contractor.email && { email: contractor.email }),
    url: contractor.website || `https://unpro.ca/contractors/${id}`,
    ...(contractor.logo_url && { image: contractor.logo_url }),
    ...(contractor.rating && (contractor.review_count ?? 0) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: contractor.rating,
        reviewCount: contractor.review_count,
        bestRating: 5,
      },
    }),
    priceRange: "$$",
    ...(enrichedAreas.length > 0 && {
      areaServed: enrichedAreas.map((a: any) => ({
        "@type": "City",
        name: a.city_name,
      })),
    }),
  };

  // FAQPage JSON-LD
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <MainLayout>
      <SeoHead title={seoTitle} description={seoDescription} canonical={`https://unpro.ca/contractors/${id}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <div className="min-h-screen pb-28">

        {/* ═══ 1. HERO ═══ */}
        <div className="relative">
          <div className="h-52 sm:h-64 md:h-72 relative overflow-hidden">
            {enrichedMedia.length > 0 && enrichedMedia[0].public_url ? (
              <img src={enrichedMedia[0].public_url} alt={`${contractor.business_name} couverture`} className="w-full h-full object-cover" loading="eager" />
            ) : (
              <img src={heroHouse} alt={`${contractor.business_name} couverture`} className="w-full h-full object-cover" loading="eager" />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(222 47% 11% / 0.15) 0%, hsl(222 47% 11% / 0.65) 100%)" }} />
            <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3 flex items-center gap-2">
              <Button asChild variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-card/20 backdrop-blur-md border border-card/10 text-primary-foreground hover:bg-card/30">
                <Link to="/search"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
            </div>
            {aippValidated && tier && (
              <div className="absolute top-4 right-4 z-20">
                <div className="rounded-2xl bg-card/90 backdrop-blur-md px-3 py-2 text-center shadow-lg border border-border/40">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">AIPP</p>
                  <p className={`text-2xl font-extrabold leading-tight ${tier.color}`}>{aippScore}</p>
                  <Badge variant="outline" className={`text-[9px] mt-0.5 border-0 ${tier.bg} ${tier.color} rounded-full px-2`}>
                    {tier.label}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Identity card */}
          <div className="relative z-10 mx-auto max-w-2xl px-5 -mt-14">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Card className="glass-card-elevated border-0 shadow-xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex gap-4 items-start">
                    <div className="h-[72px] w-[72px] shrink-0 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center overflow-hidden shadow-md border-2 border-card -mt-10">
                      {contractor.logo_url ? (
                        <img src={contractor.logo_url} alt={contractor.business_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-extrabold text-primary">{initials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg font-extrabold text-foreground leading-tight">{contractor.business_name}</h1>
                        {isAdminVerified && <ShieldCheck className="h-4 w-4 text-success shrink-0" aria-label="Validé par UnPRO" />}
                        {!isAdminVerified && isVerified && <ShieldCheck className="h-4 w-4 text-success/60 shrink-0" aria-label="Vérifié" />}
                        {!isVerified && (
                          <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border rounded-full px-2 gap-1">
                            <Eye className="h-2.5 w-2.5" /> En analyse
                          </Badge>
                        )}
                      </div>
                      {contractor.specialty && <p className="text-xs font-medium text-primary">{contractor.specialty}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {contractor.city && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contractor.city}{contractor.province ? `, ${contractor.province}` : ""}</span>
                        )}
                        {yearsExp != null && yearsExp > 0 && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{yearsExp} ans d'exp.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {contractor.rating != null && contractor.rating > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.round(contractor.rating!) ? "fill-current text-warning" : "text-muted"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-foreground">{contractor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({contractor.review_count ?? 0} avis)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 mx-auto max-w-2xl px-5 mt-5 space-y-5">

          {/* ── Trust Badges ── */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            {isAdminVerified ? (
              <UnproVerifiedBadge adminVerified={true} variant="tooltip" />
            ) : isVerified ? (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-success/5 text-success border-success/20 rounded-full px-3 py-1.5">
                <ShieldCheck className="h-3 w-3" /> Vérifié & Assuré
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5">
                <Eye className="h-3 w-3" /> Profil en cours d'analyse
              </Badge>
            )}
            {isAdminVerified && contractor.internal_verified_at && (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5">
                <Clock className="h-3 w-3" /> Validé le {new Date(contractor.internal_verified_at).toLocaleDateString("fr-CA")}
              </Badge>
            )}
            {yearsExp != null && yearsExp > 0 && (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5">
                <Award className="h-3 w-3" /> {yearsExp}+ ans
              </Badge>
            )}
            {contractor.license_number && (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-primary/5 text-primary border-primary/20 rounded-full px-3 py-1.5">
                <CheckCircle className="h-3 w-3" /> Licence RBQ
              </Badge>
            )}
            {enrichedCredentials.length > 0 && (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-accent/5 text-accent border-accent/20 rounded-full px-3 py-1.5">
                <FileCheck className="h-3 w-3" /> {enrichedCredentials.length} certif.
              </Badge>
            )}
            {contractor.rating != null && contractor.rating >= 4.5 && (
              <Badge variant="outline" className="gap-1.5 text-[11px] bg-warning/5 text-warning border-warning/20 rounded-full px-3 py-1.5">
                <Star className="h-3 w-3" /> Top évalué
              </Badge>
            )}
          </motion.div>

          {/* ── Detailed Verified Badge Panel ── */}
          {isAdminVerified && (
            <motion.div variants={fadeUp}>
              <UnproVerifiedBadge
                adminVerified={true}
                variant="detailed"
                internalVerifiedScore={contractor.internal_verified_score}
                internalVerifiedAt={contractor.internal_verified_at}
              />
            </motion.div>
          )}

          {/* ═══ 2. AI SUMMARY ═══ */}
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-secondary" />
                  <h2 className="text-sm font-bold text-foreground">Résumé IA UNPRO</h2>
                  <Badge variant="outline" className="ml-auto text-[9px] rounded-full bg-secondary/10 text-secondary border-secondary/20">
                    Généré par UNPRO
                  </Badge>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {aiProfile?.summary_fr
                    ? aiProfile.summary_fr
                    : contractor.description
                    ? contractor.description
                    : `${contractor.business_name} est ${isVerified ? "un entrepreneur vérifié" : "un entrepreneur"} spécialisé en ${contractor.specialty || "services de construction"} dans la région de ${contractor.city || "Québec"}${yearsExp ? `, avec ${yearsExp} années d'expérience` : ""}. Son profil est en cours d'enrichissement sur UNPRO.`}
                </p>
                {!aiProfile?.summary_fr && !contractor.description && (
                  <p className="mt-2 text-[11px] text-muted-foreground/60 italic">Le résumé IA sera généré lorsque suffisamment de données seront disponibles.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ 2b. WHY RECOMMENDED (Trust Explanation) ═══ */}
          <motion.div variants={fadeUp}>
            <WhyThisContractorIsRecommended
              variant="full"
              contractor={{
                admin_verified: isAdminVerified,
                verification_status: contractor.verification_status,
                aipp_score: aippScore,
                rating: contractor.rating,
                review_count: contractor.review_count,
                years_experience: yearsExp,
                has_rbq: !!contractor.license_number,
                has_neq: enrichedCredentials.some((c: any) => c.credential_type === "neq"),
                has_insurance: enrichedCredentials.some((c: any) => c.credential_type === "insurance"),
                has_website: !!contractor.website,
                credential_count: enrichedCredentials.length,
                internal_verified_at: contractor.internal_verified_at,
              }}
            />
          </motion.div>

          {/* ═══ 3. WHY UNPRO AI RECOMMENDS ═══ */}
          {aiProfile && (aiProfile.recommendation_reasons || aiProfile.best_for) && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ThumbsUp className="h-4 w-4 text-success" />
                    <h2 className="text-sm font-bold text-foreground">Pourquoi UNPRO AI recommande cette entreprise</h2>
                  </div>
                  {aiProfile.recommendation_reasons && Array.isArray(aiProfile.recommendation_reasons) && (
                    <div className="space-y-2 mb-3">
                      {(aiProfile.recommendation_reasons as string[]).map((r: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span className="text-[12px] text-foreground leading-relaxed">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiProfile.best_for && Array.isArray(aiProfile.best_for) && (aiProfile.best_for as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Idéal pour</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(aiProfile.best_for as string[]).map((b: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-success/5 text-success border-success/20 rounded-full px-2.5 py-1">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiProfile.personality_tags && aiProfile.personality_tags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Personnalité</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiProfile.personality_tags.map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 rounded-full px-2.5 py-1">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 4. CONSIDERATIONS ═══ */}
          {aiProfile && (aiProfile.considerations || aiProfile.not_ideal_for) && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h2 className="text-sm font-bold text-foreground">À considérer</h2>
                  </div>
                  {aiProfile.considerations && Array.isArray(aiProfile.considerations) && (
                    <div className="space-y-2 mb-3">
                      {(aiProfile.considerations as string[]).map((c: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                          <span className="text-[12px] text-muted-foreground leading-relaxed">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiProfile.not_ideal_for && Array.isArray(aiProfile.not_ideal_for) && (aiProfile.not_ideal_for as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Moins adapté pour</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(aiProfile.not_ideal_for as string[]).map((n: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-warning/5 text-warning border-warning/20 rounded-full px-2.5 py-1">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 5. SERVICES ═══ */}
          {enrichedServices.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Wrench className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-bold text-foreground">Services offerts</h2>
                    <span className="ml-auto text-[10px] text-muted-foreground">{enrichedServices.length} services</span>
                  </div>
                  {primaryServices.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Services principaux</p>
                      <div className="flex flex-wrap gap-2">
                        {primaryServices.map((s: any) => (
                          <Badge key={s.id} variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 rounded-full px-3 py-1.5">
                            {s.service_name_fr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {secondaryServices.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Services complémentaires</p>
                      <div className="flex flex-wrap gap-2">
                        {secondaryServices.map((s: any) => (
                          <Badge key={s.id} variant="outline" className="text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5">
                            {s.service_name_fr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Fallback if no primary/secondary distinction */}
                  {primaryServices.length === 0 && secondaryServices.length === 0 && (
                    <div className="flex flex-wrap gap-2">
                      {enrichedServices.map((s: any) => (
                        <Badge key={s.id} variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 rounded-full px-3 py-1.5">
                          {s.service_name_fr}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Fallback: specialty-based service card */}
          {enrichedServices.length === 0 && contractor.specialty && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-bold text-foreground">Spécialité</h2>
                  </div>
                  <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 rounded-full px-3 py-1.5">
                    {contractor.specialty}
                  </Badge>
                  <p className="mt-2 text-[11px] text-muted-foreground/60 italic">Le détail des services sera affiché lorsque l'entrepreneur aura complété son profil.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 6. ASSOCIATED PROBLEMS ═══ */}
          {enrichedProblems.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4 text-warning" />
                    <h2 className="text-sm font-bold text-foreground">Problèmes souvent associés</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {enrichedProblems.map((pl: any, i: number) => (
                      <Link
                        key={i}
                        to={pl.problem?.slug ? `/problems/${pl.problem.slug}` : "#"}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                          <Zap className="h-3 w-3 text-warning" />
                        </div>
                        <span className="text-[12px] font-medium text-foreground">
                          {pl.problem?.name_fr ?? `Problème #${i + 1}`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 7. ZONES DESSERVIES ═══ */}
          {(enrichedAreas.length > 0 || contractor.city) && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Map className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-bold text-foreground">Zones desservies</h2>
                    {enrichedAreas.length > 0 && (
                      <span className="ml-auto text-[10px] text-muted-foreground">{enrichedAreas.length} villes</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primaryArea && (
                      <Badge variant="outline" className="text-[11px] bg-accent/10 text-accent border-accent/30 rounded-full px-3 py-1.5 gap-1.5 font-semibold">
                        <MapPin className="h-3 w-3" /> {primaryArea.city_name}
                        <span className="text-[9px] opacity-70">principale</span>
                      </Badge>
                    )}
                    {enrichedAreas.filter((a: any) => !a.is_primary).map((a: any) => (
                      <Badge key={a.id} variant="outline" className="text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5 gap-1">
                        <MapPin className="h-3 w-3" /> {a.city_name}
                        {a.validation_status === "pending" && (
                          <span className="text-[8px] text-warning">(en validation)</span>
                        )}
                      </Badge>
                    ))}
                    {enrichedAreas.length === 0 && contractor.city && (
                      <Badge variant="outline" className="text-[11px] bg-accent/5 text-accent border-accent/20 rounded-full px-3 py-1.5 gap-1">
                        <MapPin className="h-3 w-3" /> {contractor.city}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 8. PROOFS & CREDIBILITY ═══ */}
          {(enrichedCredentials.length > 0 || enrichedMedia.length > 0 || contractor.license_number || contractor.insurance_info) && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-success" />
                    <h2 className="text-sm font-bold text-foreground">Preuves et crédibilité</h2>
                  </div>

                  {/* Credentials */}
                  {(enrichedCredentials.length > 0 || contractor.license_number || contractor.insurance_info) && (
                    <div className="mb-4">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Certifications vérifiées</p>
                      <div className="space-y-2">
                        {contractor.license_number && (
                          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-success/5">
                            <ShieldCheck className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-[12px] font-medium text-foreground">Licence RBQ</p>
                              <p className="text-[10px] text-muted-foreground">{contractor.license_number}</p>
                            </div>
                            {isVerified && <Badge variant="outline" className="ml-auto text-[9px] bg-success/10 text-success border-success/20 rounded-full">Vérifié</Badge>}
                          </div>
                        )}
                        {contractor.insurance_info && (
                          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-success/5">
                            <Shield className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-[12px] font-medium text-foreground">Assurance responsabilité</p>
                              <p className="text-[10px] text-muted-foreground">{contractor.insurance_info}</p>
                            </div>
                          </div>
                        )}
                        {enrichedCredentials.map((cred: any) => (
                          <div key={cred.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-success/5">
                            <FileCheck className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-[12px] font-medium text-foreground">{cred.credential_type}</p>
                              {cred.issuer && <p className="text-[10px] text-muted-foreground">{cred.issuer}</p>}
                            </div>
                            <Badge variant="outline" className="ml-auto text-[9px] bg-success/10 text-success border-success/20 rounded-full">Vérifié</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolio media */}
                  {enrichedMedia.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                        <Camera className="h-3 w-3 inline mr-1" />Portfolio ({enrichedMedia.length} photos)
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {enrichedMedia.slice(0, 6).map((m: any) => (
                          <div key={m.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
                            <img
                              src={m.public_url || m.storage_path}
                              alt={m.alt_text || `Réalisation ${contractor.business_name}`}
                              className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                      {enrichedMedia.length > 6 && (
                        <p className="text-center text-[11px] text-primary mt-2 font-medium">+{enrichedMedia.length - 6} autres photos</p>
                      )}
                    </div>
                  )}

                  {/* Legacy portfolio_urls fallback */}
                  {enrichedMedia.length === 0 && contractor.portfolio_urls && contractor.portfolio_urls.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Portfolio</p>
                      <div className="grid grid-cols-3 gap-2">
                        {contractor.portfolio_urls.slice(0, 6).map((url: string, i: number) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                            <img src={url} alt={`Réalisation ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 9. AIPP SCORE ═══ */}
          {aippValidated && aippBreakdown && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Score AIPP détaillé</h2>
                    {tier && (
                      <Badge variant="outline" className={`ml-auto text-[9px] rounded-full border-0 ${tier.bg} ${tier.color}`}>
                        {tier.label} — {aippScore}/100
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-center mb-4">
                    <ScoreRing score={aippScore!} size={80} strokeWidth={6} />
                  </div>
                  <div className="space-y-3">
                    {AIPP_PILLARS.map(pillar => {
                      const score = (aippBreakdown as any)?.[pillar.key] ?? 0;
                      const pct = Math.round((score / pillar.max) * 100);
                      return (
                        <div key={pillar.key} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <pillar.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-foreground">{pillar.label}</span>
                              <span className="text-[11px] font-bold text-foreground">{score}/{pillar.max}</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {aippBreakdown.score_confidence != null && (
                    <p className="mt-3 text-[10px] text-muted-foreground text-center">
                      Confiance du calcul : {Math.round(aippBreakdown.score_confidence * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Score dashboard (non-AIPP scores) */}
          {(unproScore != null && unproScore > 0) || (trustScore != null && trustScore > 0) ? (
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-2 gap-2.5">
                {unproScore != null && unproScore > 0 && (
                  <Card className="glass-card border-0 shadow-sm">
                    <CardContent className="p-3 flex flex-col items-center text-center">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-extrabold text-primary">{Math.round(unproScore)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide">UNPRO</p>
                    </CardContent>
                  </Card>
                )}
                {trustScore != null && trustScore > 0 && (
                  <Card className="glass-card border-0 shadow-sm">
                    <CardContent className="p-3 flex flex-col items-center text-center">
                      <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                        <span className="text-lg font-extrabold text-success">{Math.round(trustScore)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide">Confiance</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          ) : null}

          {/* ═══ 10. REVIEWS + AI ANALYSIS ═══ */}
          {((reviews && reviews.length > 0) || reviewDimensions?.length || reviewConfidence) && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 text-warning" />
                    <h2 className="text-sm font-bold text-foreground">Avis et analyse IA</h2>
                    {reviewConfidence && (
                      <Badge variant="outline" className={`ml-auto text-[9px] rounded-full ${getConfidenceColor(reviewConfidence)}`}>
                        Fiabilité {reviewConfidence === "high" ? "élevée" : reviewConfidence === "moderate" ? "modérée" : "faible"}
                      </Badge>
                    )}
                  </div>

                  {/* Review aggregate */}
                  {reviewAggregate && (
                    <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/50">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-foreground">{reviewAggregate.average_rating?.toFixed(1) ?? "—"}</p>
                        <div className="flex items-center gap-0.5 justify-center mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < Math.round(reviewAggregate.average_rating ?? 0) ? "fill-current text-warning" : "text-muted"}`} />
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{reviewAggregate.total_reviews} avis</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map(r => {
                          const count = (reviewAggregate as any)?.[`rating_${r}`] ?? 0;
                          const pct = reviewAggregate.total_reviews ? Math.round((count / reviewAggregate.total_reviews) * 100) : 0;
                          return (
                            <div key={r} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-3 text-right">{r}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-7">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review dimensions */}
                  {reviewDimensions && reviewDimensions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Analyse par dimension</p>
                      <div className="grid grid-cols-2 gap-2">
                        {reviewDimensions.map((d: any) => (
                          <div key={d.id} className="p-2.5 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-foreground">{REVIEW_DIMENSION_LABELS[d.dimension_code] ?? d.dimension_code}</span>
                              <span className="text-[11px] font-bold text-foreground">{d.score_weighted?.toFixed(1) ?? "—"}</span>
                            </div>
                            <Progress value={(d.score_weighted ?? 0) * 10} className="h-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sentiment themes */}
                  {topPositiveThemes.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Points forts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topPositiveThemes.map((theme, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-success/5 text-success border-success/20 rounded-full gap-1">
                            <CheckCircle className="h-2.5 w-2.5" /> {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {topNegativeThemes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Points à surveiller</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topNegativeThemes.map((theme, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-warning/5 text-warning border-warning/20 rounded-full gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual reviews */}
                  {reviews && reviews.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review: any, i: number) => (
                          <div key={review.id}>
                            {i > 0 && <Separator className="mb-4" />}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star key={si} className={`h-3 w-3 ${si < review.rating ? "fill-current text-warning" : "text-muted"}`} />
                                  ))}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(review.created_at).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              </div>
                              {review.title && <p className="text-xs font-semibold text-foreground">{review.title}</p>}
                              {review.content && <p className="text-[12px] text-muted-foreground leading-relaxed">{review.content}</p>}
                            </div>
                          </div>
                        ))}
                        {reviews.length > 3 && !showAllReviews && (
                          <button
                            onClick={() => setShowAllReviews(true)}
                            className="w-full text-center text-xs font-semibold text-primary py-2 hover:underline flex items-center justify-center gap-1"
                          >
                            Voir tous les {reviews.length} avis <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ 11. FAQ ═══ */}
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Questions fréquentes</h2>
                </div>
                <div className="space-y-0">
                  {faqs.map((faq, i) => (
                    <div key={i}>
                      {i > 0 && <Separator />}
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full py-3 flex items-center justify-between text-left"
                      >
                        <h3 className="text-[13px] font-semibold text-foreground pr-4">{faq.q}</h3>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expandedFaq === i ? "rotate-180" : ""}`} />
                      </button>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pb-3"
                        >
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ 12. COMPARABLES ═══ */}
          {enrichedComparables.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="glass-card border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Entrepreneurs similaires</h2>
                  </div>
                  <div className="space-y-2.5">
                    {enrichedComparables.map((comp: any, i: number) => (
                      <Link
                        key={i}
                        to={`/contractors/${comp.comparable_contractor_id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {comp.logo_url ? (
                            <img src={comp.logo_url} alt={comp.business_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-primary">{(comp.business_name ?? "??").slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{comp.business_name ?? "Entrepreneur"}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {comp.specialty && <span>{comp.specialty}</span>}
                            {comp.city && <span>• {comp.city}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {comp.aipp_score != null && comp.aipp_score > 0 && (
                            <p className="text-[11px] font-bold text-primary">{comp.aipp_score}</p>
                          )}
                          {comp.rating != null && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-current text-warning" />
                              <span className="text-[10px] text-muted-foreground">{comp.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Contact ── */}
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-foreground mb-3">Coordonnées</h2>
                <div className="space-y-2.5">
                  {contractor.city && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <span className="text-foreground">{contractor.city}{contractor.province ? `, ${contractor.province}` : ""}{contractor.postal_code ? ` ${contractor.postal_code}` : ""}</span>
                    </div>
                  )}
                  {contractor.phone && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <span className="text-foreground">{contractor.phone}</span>
                    </div>
                  )}
                  {contractor.email && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <span className="text-foreground">{contractor.email}</span>
                    </div>
                  )}
                  {contractor.website && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Globe className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                        {contractor.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ 13. CTA Section ═══ */}
          <motion.div variants={fadeUp}>
            <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/5">
              <CardContent className="p-5 text-center space-y-3">
                <h2 className="text-base font-bold text-foreground">Intéressé par {contractor.business_name} ?</h2>
                <p className="text-[13px] text-muted-foreground">Prenez rendez-vous, comparez avec d'autres entrepreneurs ou parlez avec Alex.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {isHomeowner ? (
                    <>
                      <Button asChild size="sm" className="rounded-xl gap-1.5">
                        <Link to={`/dashboard/book/${id}`}><CalendarPlus className="h-3.5 w-3.5" /> Prendre rendez-vous</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
                        <Link to="/search"><Users className="h-3.5 w-3.5" /> Comparer</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="rounded-xl gap-1.5">
                        <Link to="/alex"><MessageSquare className="h-3.5 w-3.5" /> Parler à Alex</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild size="sm" className="rounded-xl gap-1.5">
                        <Link to={isAuthenticated ? "/search" : `/signup?redirect=/contractors/${id}`}>
                          {isAuthenticated ? "Comparer" : "Créer un compte"} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {!isAuthenticated && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <Link to={`/login?redirect=/contractors/${id}`}>Connexion</Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ═══ 13. STICKY CTA FOOTER ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-border/60 safe-area-bottom">
          <div className="mx-auto max-w-2xl px-5 py-3 flex gap-2">
            {isHomeowner ? (
              <>
                <Button asChild size="lg" className="flex-1 rounded-2xl shadow-glow gap-1.5 h-12 text-sm font-bold">
                  <Link to={`/dashboard/book/${id}`}><CalendarPlus className="h-4 w-4" /> Prendre rendez-vous</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12 px-4">
                  <Link to="/dashboard/quotes/upload">Soumission</Link>
                </Button>
              </>
            ) : isAuthenticated ? (
              <div className="flex-1 text-center py-2">
                <p className="text-xs text-muted-foreground">La prise de rendez-vous est réservée aux propriétaires.</p>
              </div>
            ) : (
              <>
                <Button asChild size="lg" className="flex-1 rounded-2xl shadow-glow gap-1.5 h-12 text-sm font-bold">
                  <Link to={`/signup?redirect=/contractors/${id}`}>Créer un compte <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12 px-5">
                  <Link to={`/login?redirect=/contractors/${id}`}>Connexion</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContractorProfile;
