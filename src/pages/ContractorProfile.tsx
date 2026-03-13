/**
 * UNPRO — Public Contractor Profile Page (Premium Redesign)
 * Immersive hero, score dashboard, portfolio, review intelligence, sticky CTA.
 */

import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import ScoreRing from "@/components/ui/score-ring";
import {
  ArrowLeft, MapPin, Star, ShieldCheck, Clock,
  CalendarPlus, ArrowRight, Award, Zap, Brain,
  CheckCircle, Phone, Globe, Mail, Briefcase,
  Camera, ThumbsUp, AlertTriangle, TrendingUp,
  ChevronRight, Sparkles, Shield, Users,
} from "lucide-react";
import {
  usePublicContractorProfile,
  usePublicContractorReviews,
} from "@/hooks/usePublicContractors";
import { useContractorPublicScores, useReviewInsights } from "@/hooks/useMatchingEngine";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import heroHouse from "@/assets/hero-house.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ── Score tier label & color ── */
const getAIPPTier = (score: number) => {
  if (score >= 85) return { label: "Élite", color: "text-primary", bg: "bg-primary/10" };
  if (score >= 70) return { label: "Autorité", color: "text-success", bg: "bg-success/10" };
  if (score >= 55) return { label: "Gold", color: "text-warning", bg: "bg-warning/10" };
  if (score >= 40) return { label: "Silver", color: "text-muted-foreground", bg: "bg-muted" };
  return { label: "Bronze", color: "text-muted-foreground", bg: "bg-muted" };
};

const getConfidenceColor = (label: string) => {
  if (label === "high" || label === "élevée") return "bg-success/10 text-success";
  if (label === "moderate" || label === "modérée") return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
};

/* ── Pillar data for AIPP breakdown ── */
const AIPP_PILLARS = [
  { key: "identity", label: "Identité", icon: Briefcase, max: 20 },
  { key: "trust", label: "Confiance", icon: Shield, max: 20 },
  { key: "visibility", label: "Visibilité", icon: TrendingUp, max: 20 },
  { key: "conversion", label: "Conversion", icon: Users, max: 20 },
  { key: "ai_seo", label: "IA & SEO", icon: Sparkles, max: 20 },
];

const ContractorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contractor, isLoading, isError } = usePublicContractorProfile(id);
  const { data: reviews } = usePublicContractorReviews(id);
  const { data: publicScores } = useContractorPublicScores(id);
  const { data: reviewInsights } = useReviewInsights(id);
  const { user, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center premium-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground">Chargement du profil…</p>
        </div>
      </div>
    );
  }

  if (isError || !contractor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center premium-bg gap-4 px-5">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Briefcase className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-lg font-bold text-foreground">Entrepreneur introuvable</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Ce profil n'existe pas ou n'est pas encore vérifié sur UNPRO.
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/search">Retour à la recherche</Link>
        </Button>
      </div>
    );
  }

  const isVerified = contractor.verification_status === "verified";
  const isHomeowner = !!user && role === "homeowner";
  const isAuthenticated = !!user;
  const yearsExp = contractor.years_experience;

  const unproScore = publicScores?.unpro_score ?? null;
  const aippScore = contractor.aipp_score ?? publicScores?.aipp_score ?? null;
  const trustScore = publicScores?.trust_score ?? null;
  const tier = aippScore ? getAIPPTier(aippScore) : null;

  // Review intelligence
  const reviewConfidence = (reviewInsights as any)?.confidence_level ?? null;
  const topPositiveThemes: string[] = (reviewInsights as any)?.top_positive_themes ?? [];
  const topNegativeThemes: string[] = (reviewInsights as any)?.top_negative_themes ?? [];
  const overallSentiment = (reviewInsights as any)?.overall_sentiment_score ?? null;

  // Simulated AIPP pillar scores for visual (replace with real data when available)
  const pillarScores: Record<string, number> = {
    identity: publicScores?.profile_completeness_score ? Math.min(20, Math.round(publicScores.profile_completeness_score * 0.2)) : aippScore ? Math.round(aippScore * 0.2) : 0,
    trust: trustScore ? Math.min(20, Math.round(trustScore * 0.2)) : aippScore ? Math.round(aippScore * 0.18) : 0,
    visibility: publicScores?.visibility_score ? Math.min(20, Math.round(publicScores.visibility_score * 0.2)) : aippScore ? Math.round(aippScore * 0.22) : 0,
    conversion: aippScore ? Math.round(aippScore * 0.2) : 0,
    ai_seo: aippScore ? Math.round(aippScore * 0.2) : 0,
  };

  const initials = contractor.business_name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen premium-bg pb-28">
      {/* ═══ HERO COVER ═══ */}
      <div className="relative">
        {/* Cover image */}
        <div className="h-52 sm:h-64 md:h-72 relative overflow-hidden">
          <img
            src={heroHouse}
            alt="Couverture"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, hsl(222 47% 11% / 0.2) 0%, hsl(222 47% 11% / 0.6) 100%)",
            }}
          />
          {/* Back button */}
          <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3 flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-card/20 backdrop-blur-md border border-card/10 text-primary-foreground hover:bg-card/30">
              <Link to="/search"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          </div>
          {/* AIPP badge on cover */}
          {aippScore != null && aippScore > 0 && tier && (
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

        {/* Profile identity card — overlaps cover */}
        <div className="relative z-10 mx-auto max-w-2xl px-5 -mt-14">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="glass-card-elevated border-0 shadow-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex gap-4 items-start">
                  {/* Logo */}
                  <div className="h-[72px] w-[72px] shrink-0 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center overflow-hidden shadow-md border-2 border-card -mt-10">
                    {contractor.logo_url ? (
                      <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-extrabold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg font-extrabold text-foreground leading-tight">{contractor.business_name}</h1>
                      {isVerified && (
                        <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                      )}
                    </div>
                    {contractor.specialty && (
                      <p className="text-xs font-medium text-primary">{contractor.specialty}</p>
                    )}
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

                {/* Rating row */}
                {contractor.rating != null && contractor.rating > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.round(contractor.rating!) ? "fill-current text-warning" : "text-muted"}`}
                        />
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
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-10 mx-auto max-w-2xl px-5 mt-5 space-y-5"
      >
        {/* ── Score Dashboard ── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-3 gap-2.5">
            {aippScore != null && aippScore > 0 && (
              <Card className="glass-card border-0 shadow-sm col-span-1">
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <ScoreRing score={aippScore} size={56} strokeWidth={5} />
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide">AIPP</p>
                </CardContent>
              </Card>
            )}
            {unproScore != null && unproScore > 0 && (
              <Card className="glass-card border-0 shadow-sm col-span-1">
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-extrabold text-primary">{Math.round(unproScore)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide">UNPRO</p>
                </CardContent>
              </Card>
            )}
            {trustScore != null && trustScore > 0 && (
              <Card className="glass-card border-0 shadow-sm col-span-1">
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

        {/* ── AIPP Breakdown ── */}
        {aippScore != null && aippScore > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Profil AIPP détaillé</h3>
                </div>
                <div className="space-y-3">
                  {AIPP_PILLARS.map(pillar => {
                    const score = pillarScores[pillar.key] ?? 0;
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
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Trust Badges ── */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          {isVerified && (
            <Badge variant="outline" className="gap-1.5 text-[11px] bg-success/5 text-success border-success/20 rounded-full px-3 py-1.5">
              <ShieldCheck className="h-3 w-3" /> Vérifié & Assuré
            </Badge>
          )}
          {yearsExp != null && yearsExp > 0 && (
            <Badge variant="outline" className="gap-1.5 text-[11px] bg-muted text-muted-foreground border-border rounded-full px-3 py-1.5">
              <Award className="h-3 w-3" /> {yearsExp}+ ans d'expérience
            </Badge>
          )}
          {contractor.license_number && (
            <Badge variant="outline" className="gap-1.5 text-[11px] bg-primary/5 text-primary border-primary/20 rounded-full px-3 py-1.5">
              <CheckCircle className="h-3 w-3" /> Licence RBQ
            </Badge>
          )}
          {contractor.rating != null && contractor.rating >= 4.5 && (
            <Badge variant="outline" className="gap-1.5 text-[11px] bg-warning/5 text-warning border-warning/20 rounded-full px-3 py-1.5">
              <Star className="h-3 w-3" /> Top évalué
            </Badge>
          )}
        </motion.div>

        {/* ── About ── */}
        {contractor.description && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">À propos</h3>
                <p className="text-[13px] text-muted-foreground whitespace-pre-line leading-relaxed">
                  {contractor.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Contact & Details ── */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Coordonnées</h3>
              <div className="space-y-2.5">
                {contractor.city && (
                  <div className="flex items-center gap-3 text-[13px]">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-foreground">{contractor.city}{contractor.province ? `, ${contractor.province}` : ""}{contractor.postal_code ? ` ${contractor.postal_code}` : ""}</span>
                  </div>
                )}
                {contractor.phone && (
                  <div className="flex items-center gap-3 text-[13px]">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-foreground">{contractor.phone}</span>
                  </div>
                )}
                {contractor.email && (
                  <div className="flex items-center gap-3 text-[13px]">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-foreground">{contractor.email}</span>
                  </div>
                )}
                {contractor.website && (
                  <div className="flex items-center gap-3 text-[13px]">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {contractor.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Review Intelligence ── */}
        {(topPositiveThemes.length > 0 || reviewConfidence) && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-secondary" />
                  <h3 className="text-sm font-bold text-foreground">Intelligence des avis</h3>
                  {reviewConfidence && (
                    <Badge variant="outline" className={`ml-auto text-[9px] rounded-full ${getConfidenceColor(reviewConfidence)}`}>
                      Fiabilité {reviewConfidence === "high" ? "élevée" : reviewConfidence === "moderate" ? "modérée" : "faible"}
                    </Badge>
                  )}
                </div>

                {overallSentiment != null && (
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50">
                    <ThumbsUp className="h-4 w-4 text-success" />
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground">Sentiment global</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={overallSentiment} className="h-1.5 flex-1" />
                        <span className="text-xs font-bold text-foreground">{overallSentiment}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {topPositiveThemes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Points forts mentionnés</p>
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
                  <div>
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
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Portfolio ── */}
        {contractor.portfolio_urls && contractor.portfolio_urls.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-bold text-foreground">Portfolio</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {contractor.portfolio_urls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                      <img src={url} alt={`Portfolio ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Reviews ── */}
        {reviews && reviews.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    <h3 className="text-sm font-bold text-foreground">Avis clients</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{reviews.length} avis</span>
                </div>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review, i) => (
                    <div key={review.id}>
                      {i > 0 && <Separator className="mb-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star
                                key={si}
                                className={`h-3 w-3 ${si < review.rating ? "fill-current text-warning" : "text-muted"}`}
                              />
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
                  {reviews.length > 5 && (
                    <button className="w-full text-center text-xs font-semibold text-primary py-2 hover:underline flex items-center justify-center gap-1">
                      Voir tous les avis <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* ═══ STICKY CTA FOOTER ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-border/60 safe-area-bottom">
        <div className="mx-auto max-w-2xl px-5 py-3 flex gap-2">
          {isHomeowner ? (
            <>
              <Button asChild size="lg" className="flex-1 rounded-2xl shadow-glow gap-1.5 h-12 text-sm font-bold">
                <Link to={`/dashboard/book/${id}`}>
                  <CalendarPlus className="h-4 w-4" /> Prendre rendez-vous
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12 px-4">
                <Link to="/dashboard/quotes/upload">
                  Soumission
                </Link>
              </Button>
            </>
          ) : isAuthenticated ? (
            <div className="flex-1 text-center py-2">
              <p className="text-xs text-muted-foreground">
                La prise de rendez-vous est réservée aux propriétaires.
              </p>
            </div>
          ) : (
            <>
              <Button asChild size="lg" className="flex-1 rounded-2xl shadow-glow gap-1.5 h-12 text-sm font-bold">
                <Link to={`/signup?redirect=/contractors/${id}`}>
                  Créer un compte <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12 px-5">
                <Link to={`/login?redirect=/contractors/${id}`}>
                  Connexion
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorProfile;
