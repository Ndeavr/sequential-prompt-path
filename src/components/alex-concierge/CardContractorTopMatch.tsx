/**
 * CardContractorTopMatch — Premium contractor recommendation card.
 * Shows AIPP score, reason, estimated price/delay, and booking CTA.
 */
import { motion } from "framer-motion";
import { Star, Clock, Shield, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchedContractor } from "@/services/alexStateMachine";

interface Props {
  contractor: MatchedContractor;
  onBook: () => void;
  onViewProfile?: () => void;
}

function getTierBadge(tier: string) {
  const config: Record<string, { label: string; className: string }> = {
    elite: { label: "Élite", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    authority: { label: "Autorité", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    gold: { label: "Or", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
    silver: { label: "Argent", className: "bg-gray-400/10 text-gray-600 border-gray-400/20" },
    bronze: { label: "Bronze", className: "bg-orange-400/10 text-orange-600 border-orange-400/20" },
  };
  return config[tier] || config.silver;
}

export default function CardContractorTopMatch({ contractor, onBook, onViewProfile }: Props) {
  const badge = getTierBadge(contractor.tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {contractor.avatarUrl ? (
              <img src={contractor.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{contractor.companyName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                {badge.label}
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-semibold text-foreground">{contractor.aippScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Why this match */}
        <div className="bg-muted/30 rounded-xl p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Pourquoi lui</p>
          <p className="text-sm text-foreground">{contractor.reason}</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground">Délai estimé</p>
              <p className="text-xs font-semibold text-foreground">{contractor.estimatedDelay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground">Prix estimé</p>
              <p className="text-xs font-semibold text-foreground">
                {contractor.estimatedPriceMin}$ — {contractor.estimatedPriceMax}$
              </p>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Button onClick={onBook} className="flex-1 h-11">
            Prendre rendez-vous
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          {onViewProfile && (
            <Button variant="outline" onClick={onViewProfile} className="h-11 px-4">
              Profil
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
