/**
 * UNPRO — Coach Smart Nudges Widget
 */
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, ChevronRight, Award, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";

interface Props {
  completeness: number;
  aipp: number;
  reviewCount: number;
  plan: string;
}

const NUDGE_ICONS: Record<string, any> = {
  badge: Award,
  score: TrendingUp,
  trust: Shield,
  warning: AlertTriangle,
};

export default function CoachNudges({ completeness, aipp, reviewCount, plan }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const nudges = useMemo(() => {
    const n: { id: string; type: string; title: string; message: string; priority: string }[] = [];

    if (completeness < 60) {
      n.push({
        id: "profile-low",
        type: "warning",
        title: "Profil incomplet",
        message: "Votre profil est à " + completeness + "%. Complétez-le pour recevoir des rendez-vous.",
        priority: "high",
      });
    } else if (completeness < 80) {
      n.push({
        id: "profile-almost",
        type: "badge",
        title: "Proche du badge Profil Premium",
        message: "Vous êtes à " + completeness + "%. Quelques champs manquants pour débloquer le badge.",
        priority: "medium",
      });
    }

    if (aipp < 40) {
      n.push({
        id: "aipp-low",
        type: "score",
        title: "Score AIPP à améliorer",
        message: "Votre score de " + aipp + " limite votre visibilité. Complétez vos spécialités et documents.",
        priority: "high",
      });
    }

    if (reviewCount === 0) {
      n.push({
        id: "no-reviews",
        type: "trust",
        title: "Aucun avis client",
        message: "Les avis augmentent fortement la confiance. Demandez un avis à un client récent.",
        priority: "medium",
      });
    } else if (reviewCount < 3) {
      n.push({
        id: "few-reviews",
        type: "trust",
        title: "Fraîcheur d'avis",
        message: "Vous avez " + reviewCount + " avis. Les meilleurs profils en ont 5+.",
        priority: "low",
      });
    }

    if (plan === "recrue") {
      n.push({
        id: "plan-recrue",
        type: "score",
        title: "Forfait Recrue",
        message: "Votre forfait limite l'accès aux projets de grande taille.",
        priority: "low",
      });
    }

    return n.filter(nudge => !dismissed.has(nudge.id));
  }, [completeness, aipp, reviewCount, plan, dismissed]);

  if (nudges.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Notifications coach</span>
        <span className="text-[10px] text-muted-foreground">({nudges.length})</span>
      </div>

      <AnimatePresence>
        {nudges.slice(0, 3).map((nudge) => {
          const Icon = NUDGE_ICONS[nudge.type] || Bell;
          return (
            <motion.div
              key={nudge.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10, height: 0 }}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                nudge.priority === "high"
                  ? "border-warning/30 bg-warning/[0.04]"
                  : "border-border/30 bg-card/40"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                nudge.priority === "high" ? "bg-warning/10" : "bg-primary/10"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${
                  nudge.priority === "high" ? "text-warning" : "text-primary"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{nudge.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{nudge.message}</p>
              </div>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(nudge.id))}
                className="text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
