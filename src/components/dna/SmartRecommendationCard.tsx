/**
 * UNPRO — Smart Recommendation Card
 * The hero card showing THE best match for the user with full context.
 * Ultra premium, Apple/Stripe inspired, mobile-first.
 */

import { motion } from "framer-motion";
import { Star, MapPin, ShieldCheck, Sparkles, ArrowRight, Heart, Zap } from "lucide-react";
import DNABadge from "./DNABadge";
import CCAIScoreRing from "./CCAIScoreRing";
import ScoreRing from "@/components/ui/score-ring";

interface SmartRecommendationCardProps {
  contractorName: string;
  specialty: string;
  city: string;
  logoUrl?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  yearsExperience: number;
  // Scores
  recommendationScore: number;
  ccaiScore: number;
  dnaFitScore: number;
  aippScore: number;
  // DNA
  contractorDnaLabelFr: string;
  contractorDnaType: string;
  homeownerDnaLabelFr: string;
  // Explanations
  topReasonsFr: string[];
  watchoutsFr?: string[];
  alexExplanationFr: string;
  // Actions
  onBooking?: () => void;
  onDetails?: () => void;
}

export default function SmartRecommendationCard({
  contractorName,
  specialty,
  city,
  logoUrl,
  rating,
  reviewCount,
  verified,
  yearsExperience,
  recommendationScore,
  ccaiScore,
  dnaFitScore,
  aippScore,
  contractorDnaLabelFr,
  contractorDnaType,
  homeownerDnaLabelFr,
  topReasonsFr,
  watchoutsFr,
  alexExplanationFr,
  onBooking,
  onDetails,
}: SmartRecommendationCardProps) {
  const matchLabel =
    recommendationScore >= 85
      ? "Match exceptionnel"
      : recommendationScore >= 70
      ? "Très bon match"
      : recommendationScore >= 55
      ? "Bon match"
      : "Match modéré";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-xl)]"
    >
      {/* Top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

      {/* Header */}
      <div className="p-5 pb-0 space-y-4">
        {/* Alex recommendation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 rounded-2xl bg-primary/5 border border-primary/10 p-3"
        >
          <div className="rounded-xl bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Recommandation Alex
            </p>
            <p className="text-sm text-foreground mt-0.5 leading-relaxed">
              {alexExplanationFr}
            </p>
          </div>
        </motion.div>

        {/* Contractor info */}
        <div className="flex items-start gap-4">
          <div className="relative">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={contractorName}
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {contractorName.charAt(0)}
                </span>
              </div>
            )}
            {verified && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-success p-0.5">
                <ShieldCheck className="h-3 w-3 text-success-foreground" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground truncate">{contractorName}</h3>
            <p className="text-sm text-muted-foreground">{specialty}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {rating} ({reviewCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {city}
              </span>
              <span>{yearsExperience} ans</span>
            </div>
          </div>
        </div>

        {/* DNA Badges */}
        <div className="flex flex-wrap gap-2">
          <DNABadge
            dnaType={contractorDnaType}
            dnaLabelFr={contractorDnaLabelFr}
            confidence={80}
            variant="contractor"
            size="sm"
          />
          <DNABadge
            dnaType=""
            dnaLabelFr={homeownerDnaLabelFr}
            confidence={80}
            variant="homeowner"
            size="sm"
          />
        </div>
      </div>

      {/* Score section */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
          <CCAIScoreRing score={ccaiScore} size={80} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">{recommendationScore}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                URS
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{dnaFitScore}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                DNA Fit
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{aippScore}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                AIPP
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary">{matchLabel}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Verdict
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reasons */}
      <div className="px-5 pb-2 space-y-2">
        {topReasonsFr.slice(0, 3).map((reason, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-start gap-2.5 text-sm"
          >
            <div className="rounded-lg bg-success/10 p-1 mt-0.5">
              <Heart className="h-3 w-3 text-success" />
            </div>
            <span className="text-foreground">{reason}</span>
          </motion.div>
        ))}
        {watchoutsFr && watchoutsFr.length > 0 && (
          <div className="flex items-start gap-2.5 text-sm">
            <div className="rounded-lg bg-warning/10 p-1 mt-0.5">
              <Zap className="h-3 w-3 text-warning" />
            </div>
            <span className="text-muted-foreground">{watchoutsFr[0]}</span>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="p-5 pt-3 flex gap-3">
        <button
          onClick={onBooking}
          className="flex-1 rounded-2xl bg-foreground text-background py-3 px-4 text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          Réserver un rendez-vous
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onDetails}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition"
        >
          Détails
        </button>
      </div>
    </motion.div>
  );
}
