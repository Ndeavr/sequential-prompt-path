import { motion } from "framer-motion";
import { Sparkles, Zap, TrendingUp, CheckCircle2 } from "lucide-react";

interface StrategyData {
  type: string;
  title: string;
  priorities: string[];
  quickWins: string[];
  structuralRec: string;
}

function deriveStrategy(primaryObjective: string, aippScore: number): StrategyData {
  if (primaryObjective === "maintain" || aippScore >= 75) {
    return {
      type: "maintain",
      title: "Consolidation & optimisation",
      priorities: [
        "Maintenir votre score AIPP au-dessus de 70",
        "Automatiser la réception de rendez-vous",
        "Renforcer vos avis clients",
      ],
      quickWins: [
        "Ajouter 3 photos de projets récents",
        "Répondre à tous les avis en 24h",
        "Vérifier vos certifications",
      ],
      structuralRec: "Passez au plan Élite pour verrouiller votre territoire",
    };
  }
  if (primaryObjective === "dominate" || primaryObjective === "compete") {
    return {
      type: "dominate",
      title: "Stratégie de domination locale",
      priorities: [
        "Augmenter votre score AIPP au-dessus de 80",
        "Sécuriser votre territoire en priorité",
        "Surpasser les compétiteurs en visibilité",
      ],
      quickWins: [
        "Compléter votre profil à 100%",
        "Ajouter vos certifications vérifiées",
        "Activer les rendez-vous auto-acceptés",
      ],
      structuralRec: "Le plan Signature vous donne l'exclusivité territoriale",
    };
  }
  if (primaryObjective === "growth" || primaryObjective === "profit") {
    return {
      type: "grow",
      title: "Croissance accélérée",
      priorities: [
        "Maximiser le nombre de rendez-vous qualifiés",
        "Augmenter votre taux de conversion",
        "Élargir vos zones de service",
      ],
      quickWins: [
        "Définir vos spécialités les plus rentables",
        "Ajouter une description détaillée",
        "Activer les notifications instantanées",
      ],
      structuralRec: "Le plan Premium ouvre l'accès aux projets XL",
    };
  }
  // Default: optimize
  return {
    type: "optimize",
    title: "Optimisation de votre présence",
    priorities: [
      "Améliorer votre visibilité sur les recherches locales",
      "Compléter les éléments manquants du profil",
      "Commencer à recevoir des rendez-vous ciblés",
    ],
    quickWins: [
      "Ajouter votre logo et photos",
      "Confirmer vos zones de service",
      "Activer votre profil public",
    ],
    structuralRec: "Le plan Pro vous donne accès aux projets S/M/L",
  };
}

interface Props {
  primaryObjective: string;
  aippScore: number;
}

export default function StrategyRecommendationCard({ primaryObjective, aippScore }: Props) {
  const strategy = deriveStrategy(primaryObjective, aippScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-secondary" />
        <h3 className="text-base font-bold text-foreground">Voici comment y arriver</h3>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5 p-4">
        <p className="text-sm font-semibold text-foreground">{strategy.title}</p>
      </div>

      {/* Priorities */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Priorités immédiates
        </p>
        {strategy.priorities.map((p, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-muted-foreground">{p}</span>
          </div>
        ))}
      </div>

      {/* Quick wins */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Gains rapides
        </p>
        {strategy.quickWins.map((w, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">{w}</span>
          </div>
        ))}
      </div>

      {/* Structural */}
      <div className="rounded-xl bg-secondary/5 border border-secondary/10 p-3">
        <p className="text-xs font-semibold text-secondary mb-1">💡 Recommandation stratégique</p>
        <p className="text-sm text-muted-foreground">{strategy.structuralRec}</p>
      </div>
    </motion.div>
  );
}
