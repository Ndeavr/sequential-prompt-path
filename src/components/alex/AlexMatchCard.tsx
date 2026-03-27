/**
 * AlexMatchCard — Inline contractor recommendation card shown in conversation.
 */
import { motion } from "framer-motion";
import { Star, Shield, MapPin, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlexMatchCardProps {
  match: {
    contractor_id: string;
    display_name: string;
    match_score: number;
    explanation_summary?: string;
  };
  onViewCalendar: () => void;
  onLearnMore: () => void;
}

export default function AlexMatchCard({ match, onViewCalendar, onLearnMore }: AlexMatchCardProps) {
  const scoreColor = match.match_score >= 85 ? "text-success" : match.match_score >= 70 ? "text-primary" : "text-warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-primary/25 bg-gradient-to-br from-card/90 to-primary/[0.04] backdrop-blur-sm p-4 space-y-3 shadow-[var(--shadow-lg)]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
          {match.display_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{match.display_name}</p>
          {match.explanation_summary && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{match.explanation_summary}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-bold ${scoreColor}`}>{match.match_score}%</p>
          <p className="text-[9px] text-muted-foreground">compatibilité</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-success" /> Vérifié</span>
        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning" /> Recommandé</span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onViewCalendar}
          className="flex-1 bg-gradient-to-r from-primary to-accent text-white border-0 rounded-xl h-9 text-xs font-bold hover:brightness-110 gap-1.5"
        >
          <Calendar className="w-3 h-3" /> Voir les dispos
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onLearnMore}
          className="rounded-xl h-9 text-xs gap-1"
        >
          En savoir plus <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}