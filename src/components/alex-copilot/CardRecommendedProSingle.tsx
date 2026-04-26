/**
 * CardRecommendedProSingle — single pro recommendation card.
 * HARD RULE: this component never accepts a list of pros. One pro. One choice.
 */
import { motion } from "framer-motion";
import { Star, ShieldCheck, Calendar, Clock, HelpCircle, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecommendedPro } from "@/stores/copilotConversationStore";
import heroVan from "@/assets/hero-toiture.jpg";

interface Props {
  pro: RecommendedPro;
  onBook: () => void;
  onViewSlots: () => void;
  onWhy: () => void;
  onAlternative: () => void;
  hasAlternative: boolean;
}

export default function CardRecommendedProSingle({
  pro,
  onBook,
  onViewSlots,
  onWhy,
  onAlternative,
  hasAlternative,
}: Props) {
  const image = pro.imageUrl || heroVan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-[hsl(220_40%_8%/0.85)] backdrop-blur-xl shadow-[0_12px_40px_-8px_hsl(220_100%_30%/0.4)]"
    >
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        <img src={image} alt={pro.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
          <CheckCircle2 className="w-3 h-3" /> Meilleur choix
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-[17px] font-bold text-white leading-tight">{pro.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-[13px]">
            <span className="font-semibold text-emerald-400">{pro.compatibility}% compatibilité</span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5"
                  fill={i < Math.round(pro.rating) ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span className="text-white/60 text-[12px]">({pro.reviewsCount} avis)</span>
          </div>
        </div>

        <ul className="space-y-1.5">
          {pro.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-[13px] text-white/85">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="flex items-center gap-1.5">
                {r}
                {r.toLowerCase().includes("vérifié unpro") && (
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2">
        <p className="text-[13px] font-semibold text-white/90">Souhaitez-vous prendre rendez-vous?</p>
        <Button
          onClick={onBook}
          className="w-full h-12 text-[15px] font-semibold rounded-xl gap-2 bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] hover:opacity-95 text-white shadow-[0_6px_20px_-4px_hsl(220_100%_50%/0.55)]"
        >
          <Calendar className="w-4 h-4" />
          Prendre rendez-vous
        </Button>
        <Button
          onClick={onViewSlots}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2 bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
        >
          <Clock className="w-4 h-4" /> Voir disponibilités
        </Button>
        <Button
          onClick={onWhy}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2 bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
        >
          <HelpCircle className="w-4 h-4" /> Pourquoi lui?
        </Button>
        {hasAlternative && (
          <Button
            onClick={onAlternative}
            variant="ghost"
            className="w-full h-11 rounded-xl gap-2 text-white/75 hover:text-white hover:bg-white/5"
          >
            <ArrowLeftRight className="w-4 h-4" /> Autre option
          </Button>
        )}
      </div>
    </motion.div>
  );
}
