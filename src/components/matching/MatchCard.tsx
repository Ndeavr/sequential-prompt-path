/**
 * UNPRO — Contractor Match Card
 * Premium card showing compatibility, scores, trust signals, and decision support.
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "@/components/ui/score-ring";
import {
  ShieldCheck, Star, MapPin, Clock, MessageCircle,
  AlertTriangle, CheckCircle, ArrowRight, Sparkles, Scale,
} from "lucide-react";
import { UnproVerifiedBadge } from "@/components/contractor/UnproVerifiedBadge";
import { getContractorTrustLabel } from "@/lib/trustLabels";
import WhyThisContractorIsRecommended from "@/components/contractor/WhyThisContractorIsRecommended";
import type { MatchEvaluation } from "@/types/matching";

interface MatchCardProps {
  match: MatchEvaluation;
  rank: number;
  onCompare?: (id: string) => void;
  isComparing?: boolean;
}

const getSuccessColor = (p: number) => {
  if (p >= 80) return "text-success";
  if (p >= 60) return "text-accent";
  return "text-warning";
};

const getConflictLabel = (r: number) => {
  if (r <= 20) return { label: "Faible", color: "bg-success/10 text-success" };
  if (r <= 45) return { label: "Modéré", color: "bg-warning/10 text-warning" };
  return { label: "Élevé", color: "bg-destructive/10 text-destructive" };
};

/** Trust insight text for recommendation cards — never overstates certainty */
function getMatchTrustInsight(match: MatchEvaluation): string | null {
  if ((match as any).admin_verified === true) return "Profil validé par UnPRO";
  const unpro = match.unpro_score_snapshot ?? 0;
  const aipp = match.aipp_score_snapshot ?? 0;
  if (unpro >= 70 && aipp >= 65) return "Informations cohérentes détectées";
  if (unpro < 40 || aipp < 30) return "Certaines validations restent à compléter";
  return null;
}

const MatchCard = ({ match, rank, onCompare, isComparing }: MatchCardProps) => {
  const conflict = getConflictLabel(match.conflict_risk_score);
  const explanations = (match.explanations ?? { top_reasons: [], watchouts: [] }) as any;
  const isTopMatch = rank === 1;
  const trustInsight = getMatchTrustInsight(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, duration: 0.4 }}
    >
      <Card className={`relative overflow-hidden transition-all duration-300 ${isTopMatch ? "ring-2 ring-primary/40 shadow-glow" : ""}`}>
        {isTopMatch && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        )}

        <CardContent className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {match.logo_url ? (
                  <img src={match.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    {(match.business_name ?? "?")[0]}
                  </span>
                )}
              </div>
              {isTopMatch && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-display font-semibold text-sm truncate">{match.business_name}</h3>
                {(match as any).admin_verified === true ? (
                  <UnproVerifiedBadge adminVerified={true} variant="compact" />
                ) : match.verification_status === "verified" ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{match.city}, {match.province}</span>
                {match.specialty && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">{match.specialty}</span>
                  </>
                )}
              </div>
              {match.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs font-medium">{match.rating}</span>
                  <span className="text-xs text-muted-foreground">({match.review_count ?? 0})</span>
                </div>
              )}
              {/* Trust insight — one short line */}
              {trustInsight && (
                <p className="text-[10px] mt-1 text-muted-foreground italic">{trustInsight}</p>
              )}
            </div>

            <div className="shrink-0">
              <ScoreRing score={Math.round(match.recommendation_score)} size={56} strokeWidth={5} label="URS" />
            </div>
          </div>

          {/* Score Chips */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
              <span className="text-[10px] text-muted-foreground font-medium">Succès</span>
              <span className={`text-sm font-bold ${getSuccessColor(match.success_probability)}`}>
                {Math.round(match.success_probability)}%
              </span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
              <span className="text-[10px] text-muted-foreground font-medium">CCAI</span>
              <span className="text-sm font-bold">{Math.round(match.ccai_score)}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
              <span className="text-[10px] text-muted-foreground font-medium">Risque</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${conflict.color}`}>
                {conflict.label}
              </Badge>
            </div>
          </div>

          {/* UNPRO + AIPP Mini Scores */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">U</span>
              </div>
              <span className="text-xs font-medium">{Math.round(match.unpro_score_snapshot)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-secondary/10 flex items-center justify-center">
                <span className="text-[9px] font-bold text-secondary">A</span>
              </div>
              <span className="text-xs font-medium">{Math.round(match.aipp_score_snapshot)}</span>
            </div>
            {match.years_experience && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Clock className="w-3 h-3" />
                <span>{match.years_experience} ans</span>
              </div>
            )}
          </div>

          {/* Top Reasons */}
          {explanations.top_reasons?.length > 0 && (
            <div className="mb-3">
              <div className="space-y-1">
                {(explanations.top_reasons as any[]).slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{r.text_fr}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watchouts */}
          {explanations.watchouts?.length > 0 && (
            <div className="mb-4">
              {(explanations.watchouts as any[]).slice(0, 2).map((w: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{w.text_fr}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="flex-1">
              <Link to={`/contractors/${match.contractor_id}`}>
                Voir le profil <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant={isComparing ? "default" : "outline"}
              onClick={() => onCompare?.(match.contractor_id)}
            >
              <Scale className="w-3.5 h-3.5" />
            </Button>
            <Button asChild size="sm" variant="soft">
              <Link to={`/dashboard/book/${match.contractor_id}`}>
                <MessageCircle className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchCard;
