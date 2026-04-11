import { motion } from "framer-motion";
import { Star, MapPin, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  contractorName: string;
  score: number;
  city: string;
  reasons: string[];
  onBook?: () => void;
  onViewProfile?: () => void;
}

export default function CardAlexRecommendedContractor({
  contractorName, score, city, reasons, onBook, onViewProfile,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">{score}</span>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{contractorName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{city}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-600">Recommandé UNPRO</span>
      </div>

      {reasons.length > 0 && (
        <div className="space-y-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">Pourquoi ce choix</span>
          </div>
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5 rounded-xl" onClick={onBook}>
          <Calendar className="h-3.5 w-3.5" />
          Réserver
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onViewProfile}>
          Voir profil
        </Button>
      </div>
    </motion.div>
  );
}
