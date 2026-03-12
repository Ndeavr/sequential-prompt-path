/**
 * UNPRO — Public Contractor Profile Page (Premium)
 * Shows AIPP/UNPRO badges, review intelligence, DNA profile.
 */

import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ScoreRing from "@/components/ui/score-ring";
import {
  ArrowLeft, MapPin, Star, ShieldCheck, TrendingUp, Clock,
  FileText, CalendarPlus, ArrowRight, Award, Zap, Brain,
  CheckCircle, MessageCircle, Sparkles,
} from "lucide-react";
import {
  usePublicContractorProfile,
  usePublicContractorReviews,
} from "@/hooks/usePublicContractors";
import { useContractorPublicScores, useReviewInsights } from "@/hooks/useMatchingEngine";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const WaveDivider = () => (
  <div className="wave-divider">
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
      <path d="M0 24C240 0 480 48 720 24C960 0 1200 48 1440 24V48H0Z" fill="hsl(var(--background))" />
    </svg>
  </div>
);

const getConfidenceColor = (label: string) => {
  if (label === "high" || label === "élevée") return "bg-success/10 text-success";
  if (label === "moderate" || label === "modérée") return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
};

const ContractorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contractor, isLoading, isError } = usePublicContractorProfile(id);
  const { data: reviews } = usePublicContractorReviews(id);
  const { data: publicScores } = useContractorPublicScores(id);
  const { data: reviewInsights } = useReviewInsights(id);
  const { user, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center hero-gradient">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !contractor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center hero-gradient gap-4 px-5">
        <p className="text-lg font-bold text-foreground">Entrepreneur introuvable</p>
        <p className="text-sm text-muted-foreground text-center">
          Ce profil n'existe pas ou n'est pas encore vérifié.
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

  // Review intelligence
  const reviewConfidence = (reviewInsights as any)?.confidence_level ?? null;
  const topPositiveThemes: string[] = (reviewInsights as any)?.top_positive_themes ?? [];
  const topNegativeThemes: string[] = (reviewInsights as any)?.top_negative_themes ?? [];
  const overallSentiment = (reviewInsights as any)?.overall_sentiment_score ?? null;

  return (
    <div className="min-h-screen premium-bg">
      {/* Hero header */}
      <div className="relative hero-gradient noise-overlay overflow-hidden">
        <div className="relative z-20 glass-surface border-b border-border/40">
          <div className="mx-auto max-w-2xl px-5 py-3 flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="rounded-xl h-9 w-9">
              <Link to="/search"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <span className="text-xs text-muted-foreground">Retour à la recherche</span>
          </div>
        </div>

        {/* Identity block */}
        <div className="relative z-10 mx-auto max-w-2xl px-5 pt-6 pb-20">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex gap-4 items-start">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden shadow-sm">
              {contractor.logo_url ? (
                <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gradient">
                  {contractor.business_name.charAt(0)}
                </span>
              )}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-foreground truncate">{contractor.business_name}</h1>
                {isVerified && (
                  <Badge variant="secondary" className="gap-1 text-[10px] bg-success/10 text-success border-0 rounded-full">
                    <ShieldCheck className="h-2.5 w-2.5" /> Vérifié
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {contractor.specialty && <span className="font-medium text-foreground/70">{contractor.specialty}</span>}
                {contractor.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contractor.city}</span>
                )}
                {yearsExp != null && yearsExp > 0 && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{yearsExp} ans</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <WaveDivider />
      </div>

      {/* Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-10 mx-auto max-w-2xl px-5 -mt-10 pb-10 space-y-5"
      >
        {/* Score cards grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          {aippScore != null && aippScore > 0 && (
            <Card className="glass-card border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing score={aippScore} size={52} strokeWidth={5} />
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Score AIPP</p>
                  <p className="text-lg font-bold text-foreground">{aippScore}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
                </div>
              </CardContent>
            </Card>
          )}
          {unproScore != null && unproScore > 0 && (
            <Card className="glass-card border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-[52px] w-[52px] rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">UNPRO</p>
                  <p className="text-lg font-bold text-foreground">{Math.round(unproScore)}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
                </div>
              </CardContent>
            </Card>
          )}
          {contractor.rating != null && contractor.rating > 0 && (
            <Card className="glass-card border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-[52px] w-[52px] rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Star className="h-6 w-6 fill-current text-accent" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Évaluation</p>
                  <p className="text-lg font-bold text-foreground">
                    {contractor.rating.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({contractor.review_count ?? 0})</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {trustScore != null && trustScore > 0 && (
            <Card className="glass-card border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-[52px] w-[52px] rounded-2xl bg-success/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Confiance</p>
                  <p className="text-lg font-bold text-foreground">{Math.round(trustScore)}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-1.5">
          {yearsExp != null && yearsExp > 0 && (
            <span className="trust-badge bg-muted/50 text-muted-foreground">
              <Clock className="h-3 w-3" /> {yearsExp}+ ans d'expérience
            </span>
          )}
          {isVerified && (
            <span className="trust-badge bg-muted/50 text-muted-foreground">
              <Award className="h-3 w-3" /> Certifié & Assuré
            </span>
          )}
          {contractor.rating != null && contractor.rating >= 4.0 && (
            <span className="trust-badge bg-muted/50 text-muted-foreground">
              <Star className="h-3 w-3" /> Excellent Avis
            </span>
          )}
        </motion.div>

        {/* Review Intelligence */}
        {(topPositiveThemes.length > 0 || reviewConfidence) && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-secondary" /> Intelligence des avis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topPositiveThemes.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Les clients mentionnent souvent</p>
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
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Points à surveiller</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topNegativeThemes.map((theme, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] bg-warning/5 text-warning border-warning/20 rounded-full">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {reviewConfidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Fiabilité des avis :</span>
                    <Badge variant="outline" className={`text-[10px] rounded-full ${getConfidenceColor(reviewConfidence)}`}>
                      {reviewConfidence === "high" ? "Élevée" : reviewConfidence === "moderate" ? "Modérée" : "Faible"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* About */}
        {contractor.description && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">À propos</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {contractor.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="glass-card border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> Avis ({reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.map((review, i) => (
                  <div key={review.id}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star
                              key={si}
                              className={`h-3 w-3 ${si < review.rating ? "fill-current text-accent" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>
                      {review.title && <p className="text-xs font-medium text-foreground">{review.title}</p>}
                      {review.content && <p className="text-xs text-muted-foreground leading-relaxed">{review.content}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <Card className="glass-card border-0 shadow-md overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              {isHomeowner ? (
                <>
                  <p className="text-xs text-muted-foreground">Intéressé par cet entrepreneur?</p>
                  <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
                    <Button asChild size="lg" className="rounded-2xl shadow-glow gap-1 h-12">
                      <Link to={`/dashboard/book/${id}`}>
                        <CalendarPlus className="h-4 w-4" /> Demander un rendez-vous <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12">
                      <Link to="/dashboard/quotes/upload">Téléverser une soumission</Link>
                    </Button>
                  </div>
                </>
              ) : isAuthenticated ? (
                <p className="text-xs text-muted-foreground">
                  La prise de rendez-vous est réservée aux propriétaires.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Vous souhaitez contacter cet entrepreneur?</p>
                  <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
                    <Button asChild size="lg" className="rounded-2xl shadow-glow gap-1 h-12">
                      <Link to={`/signup?redirect=/contractors/${id}`}>Créer un compte <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl glass-surface border-border/60 h-12">
                      <Link to={`/login?redirect=/contractors/${id}`}>Se connecter</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ContractorProfile;
