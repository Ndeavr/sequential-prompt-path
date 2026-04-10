import { motion } from "framer-motion";
import { Star, Clock, MapPin, ChevronRight, Calendar } from "lucide-react";
import type { MockContractor } from "./types";

interface Props {
  contractor: MockContractor;
  onViewProfile?: () => void;
  onViewSlots?: () => void;
}

export default function CardEntrepreneurInline({ contractor, onViewProfile, onViewSlots }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{contractor.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{contractor.specialty}</p>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">
            <Star className="w-3 h-3" />
            {contractor.score}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{contractor.city}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{contractor.delayDays}j</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {contractor.badges.map(b => (
            <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{b}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewProfile}
            className="flex-1 text-xs font-medium py-2 rounded-lg border border-border/60 text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1"
          >
            Voir profil <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onViewSlots}
            className="flex-1 text-xs font-semibold py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Réserver
          </button>
        </div>
      </div>
    </motion.div>
  );
}
