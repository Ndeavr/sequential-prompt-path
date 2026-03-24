import { motion } from "framer-motion";
import { MapPin, Target, AlertTriangle } from "lucide-react";
import ScoreRing from "@/components/ui/score-ring";

interface Props {
  aippScore: number;
  marketPosition: string;
  completionPercent: number;
  city: string;
  primaryObjective: string;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  maintain: "Maintenir vos revenus actuels",
  visibility: "Améliorer votre visibilité en ligne",
  profit: "Augmenter vos profits",
  appointments: "Obtenir plus de rendez-vous qualifiés",
  compete: "Dépasser vos compétiteurs",
  dominate: "Dominer votre marché local",
  growth: "Accélérer votre croissance",
};

const POSITION_LABELS: Record<string, string> = {
  behind: "En arrière",
  equal: "Ex aequo",
  ahead: "Loin devant",
  dominant: "Vous dominez",
};

export default function CurrentSituationSummary({ aippScore, marketPosition, completionPercent, city, primaryObjective }: Props) {
  const gaps: string[] = [];
  if (completionPercent < 80) gaps.push("Profil incomplet");
  if (aippScore < 50) gaps.push("Score AIPP faible");
  if (marketPosition === "behind") gaps.push("Retard concurrentiel");
  if (aippScore < 70) gaps.push("Visibilité limitée");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-5"
    >
      <h3 className="text-base font-bold text-foreground">Votre situation actuelle</h3>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="space-y-1">
          <div className="mx-auto w-fit">
            <ScoreRing score={aippScore} size={48} strokeWidth={4} />
          </div>
          <p className="text-[11px] text-muted-foreground">Score AIPP</p>
        </div>
        <div className="space-y-1">
          <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-[11px] text-muted-foreground">{city || "Votre ville"}</p>
        </div>
        <div className="space-y-1">
          <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
            {completionPercent}%
          </div>
          <p className="text-[11px] text-muted-foreground">Profil</p>
        </div>
      </div>

      {/* Where you want to go */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Votre objectif</span>
        </div>
        <p className="text-sm text-muted-foreground">{OBJECTIVE_LABELS[primaryObjective] || "Non défini"}</p>
      </div>

      {/* What's missing */}
      {gaps.length > 0 && (
        <div className="rounded-xl bg-orange-500/5 border border-orange-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-foreground">Ce qui vous manque</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map(g => (
              <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">{g}</span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
