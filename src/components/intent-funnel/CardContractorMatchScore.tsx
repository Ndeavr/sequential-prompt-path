/**
 * CardContractorMatchScore — Contractor match card with DNA score ring and badges.
 */
import { motion } from "framer-motion";
import { Star, Shield, CheckCircle2, Calendar } from "lucide-react";
import type { MatchedContractor } from "@/hooks/useIntentFunnel";

interface Props {
  contractor: MatchedContractor;
  isPrimary?: boolean;
  onBook: () => void;
  onSelect: () => void;
  isSelected?: boolean;
}

export default function CardContractorMatchScore({ contractor, isPrimary, onBook, onSelect, isSelected }: Props) {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (contractor.score / 100) * circumference;

  return (
    <motion.div
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
        isPrimary
          ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
          : isSelected
          ? "border-primary/30 bg-card/80"
          : "border-border/60 bg-card/60"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Score ring */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-foreground">{contractor.score}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{contractor.business_name}</h3>
            {isPrimary && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                #1
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2">{contractor.city} · {contractor.specialty.join(", ")}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {contractor.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                <Shield className="w-3 h-3" /> Vérifié
              </span>
            )}
            {contractor.rbq && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-3 h-3" /> RBQ
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
              <Star className="w-3 h-3" /> {contractor.review_rating} ({contractor.review_count})
            </span>
          </div>

          {/* Book CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onBook(); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold
              bg-primary text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98]
              transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Réserver
          </button>
        </div>
      </div>
    </motion.div>
  );
}
