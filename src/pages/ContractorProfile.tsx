/**
 * UNPRO — Public Contractor Profile Page
 */

import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ScoreRing from "@/components/ui/score-ring";
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  TrendingUp,
  Clock,
  FileText,
  CalendarPlus,
  ArrowRight,
} from "lucide-react";
import {
  usePublicContractorProfile,
  usePublicContractorReviews,
} from "@/hooks/usePublicContractors";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ContractorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contractor, isLoading, isError } = usePublicContractorProfile(id);
  const { data: reviews } = usePublicContractorReviews(id);
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
      <div className="flex min-h-screen flex-col items-center justify-center hero-gradient gap-4">
        <p className="text-lg font-medium text-foreground">Entrepreneur introuvable</p>
        <p className="text-sm text-muted-foreground">
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

  return (
    <div className="min-h-screen mesh-gradient noise-overlay">
      {/* Top bar */}
      <div className="border-b border-border/50 glass-surface sticky top-0 z-20">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link to="/search"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm text-muted-foreground">Retour à la recherche</span>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-8 space-y-6 z-10">
        {/* Identity block */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex gap-4 items-start">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden shadow-soft">
            {contractor.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gradient">
                {contractor.business_name.charAt(0)}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{contractor.business_name}</h1>
              {isVerified && (
                <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-0 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Vérifié
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {contractor.specialty && <span className="font-medium text-foreground/70">{contractor.specialty}</span>}
              {contractor.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {contractor.city}{contractor.province ? `, ${contractor.province}` : ""}
                </span>
              )}
              {contractor.years_experience != null && contractor.years_experience > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {contractor.years_experience} ans
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Scores */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-wrap gap-4">
          {contractor.aipp_score != null && contractor.aipp_score > 0 && (
            <Card className="flex-1 min-w-[140px] glass-card border-0 shadow-soft">
              <CardContent className="p-5 flex items-center gap-4">
                <ScoreRing score={contractor.aipp_score} size={56} strokeWidth={5} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Score AIPP</p>
                  <p className="text-lg font-bold text-foreground">{contractor.aipp_score}/100</p>
                </div>
              </CardContent>
            </Card>
          )}
          {contractor.rating != null && contractor.rating > 0 && (
            <Card className="flex-1 min-w-[140px] glass-card border-0 shadow-soft">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Star className="h-6 w-6 fill-current text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Évaluation</p>
                  <p className="text-lg font-bold text-foreground">{contractor.rating.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">({contractor.review_count ?? 0} avis)</span></p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Description */}
        {contractor.description && (
          <Card className="glass-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">À propos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {contractor.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <Card className="glass-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Avis ({reviews.length})
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
                            className={`h-3.5 w-3.5 ${si < review.rating ? "fill-current text-yellow-500" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("fr-CA")}
                      </span>
                    </div>
                    {review.title && (
                      <p className="text-sm font-medium text-foreground">{review.title}</p>
                    )}
                    {review.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="glass-card border-0 shadow-elevation overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            {isHomeowner ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Intéressé par cet entrepreneur?
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                  <Button asChild size="lg" className="rounded-2xl shadow-glow gap-1">
                    <Link to={`/dashboard/book/${id}`}>
                      <CalendarPlus className="h-4 w-4" /> Demander un rendez-vous <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link to="/dashboard/quotes/upload">Téléverser une soumission</Link>
                  </Button>
                </div>
              </>
            ) : isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                La prise de rendez-vous est réservée aux propriétaires.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Vous souhaitez contacter cet entrepreneur?
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                  <Button asChild size="lg" className="rounded-2xl shadow-glow gap-1">
                    <Link to={`/signup?redirect=/contractors/${id}`}>Créer un compte <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link to={`/login?redirect=/contractors/${id}`}>Se connecter</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorProfile;
