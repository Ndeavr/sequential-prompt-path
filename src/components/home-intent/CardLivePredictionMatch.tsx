/**
 * CardLivePredictionMatch — Shows the best matching contractor after intent detection.
 */
import { motion } from "framer-motion";
import { Star, Clock, ArrowRight } from "lucide-react";

export interface PredictionMatch {
  name: string;
  score: number;
  badge: string;
  delay: string;
  priceMin: number;
  priceMax: number;
}

interface Props {
  match: PredictionMatch;
  onBook: () => void;
}

export default function CardLivePredictionMatch({ match, onBook }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5 rounded-2xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-body-lg text-foreground">{match.name}</p>
          <span className="text-caption font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {match.badge}
          </span>
        </div>
        <div className="flex items-center gap-1 text-warning">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-meta font-semibold">{match.score}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-meta text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {match.delay}
        </span>
        <span>
          {match.priceMin.toLocaleString()}$ – {match.priceMax.toLocaleString()}$
        </span>
      </div>

      <button
        onClick={onBook}
        className="w-full py-3 rounded-xl font-semibold text-body
          bg-primary text-primary-foreground
          hover:bg-primary/90 active:scale-[0.98]
          flex items-center justify-center gap-2 transition-all"
      >
        Réserver <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
