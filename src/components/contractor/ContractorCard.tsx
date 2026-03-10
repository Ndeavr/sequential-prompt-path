import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, ShieldCheck, TrendingUp, ArrowRight, Clock, Award } from "lucide-react";
import { motion } from "framer-motion";

interface ContractorCardProps {
  contractor: {
    id: string;
    business_name: string;
    specialty: string | null;
    city: string | null;
    province: string | null;
    description: string | null;
    verification_status: string | null;
    aipp_score: number | null;
    rating: number | null;
    review_count: number | null;
    logo_url: string | null;
    years_experience?: number | null;
  };
}

const ContractorCard = ({ contractor }: ContractorCardProps) => {
  const isVerified = contractor.verification_status === "verified";
  const hasScore = contractor.aipp_score != null && contractor.aipp_score > 0;
  const hasRating = contractor.rating != null && contractor.rating > 0;
  const yearsExp = (contractor as any).years_experience;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="glass-card border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Top row: avatar + info + score */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden">
              {contractor.logo_url ? (
                <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gradient">
                  {contractor.business_name.charAt(0)}
                </span>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-base truncate">
                  {contractor.business_name}
                </h3>
                {isVerified && (
                  <Badge variant="secondary" className="gap-1 text-[10px] bg-success/10 text-success border-0 rounded-full px-2 py-0.5">
                    <ShieldCheck className="h-2.5 w-2.5" /> Vérifié
                  </Badge>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                {hasRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-accent" />
                    {contractor.rating!.toFixed(1)}
                  </span>
                )}
                {contractor.review_count != null && contractor.review_count > 0 && (
                  <span>{contractor.review_count} avis</span>
                )}
                {yearsExp != null && yearsExp > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {yearsExp}+ ans
                  </span>
                )}
                {contractor.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {contractor.city}
                  </span>
                )}
              </div>
            </div>

            {/* AIPP Score badge */}
            {hasScore && (
              <div className="shrink-0 text-center">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">AIPP</div>
                <div className="text-xl font-bold text-primary leading-tight">{contractor.aipp_score}</div>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-1.5">
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
            {hasRating && contractor.rating! >= 4.0 && (
              <span className="trust-badge bg-muted/50 text-muted-foreground">
                <Star className="h-3 w-3" /> Excellent Avis
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            <Button asChild size="sm" className="flex-1 rounded-xl gap-1 h-10">
              <Link to={`/dashboard/book/${contractor.id}`}>
                Rendez-vous <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl h-10 glass-surface border-border/60">
              <Link to={`/contractors/${contractor.id}`}>
                Voir profil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ContractorCard;
