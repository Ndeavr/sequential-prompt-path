/**
 * CardAIPPInterpretationInstant — Immediate score interpretation after reveal.
 */
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Shield, Zap } from "lucide-react";

interface Props {
  score: number;
  visible: boolean;
}

function getInterpretation(score: number) {
  if (score >= 80) return {
    icon: Shield,
    headline: "Positionnement fort",
    summary: "Votre entreprise est bien structurée et lisible par l'IA. Vous avez une base solide pour dominer votre territoire et capter davantage de rendez-vous.",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
    nextAction: "Consolider et dominer votre marché",
  };
  if (score >= 60) return {
    icon: TrendingUp,
    headline: "Niveau solide — optimisation possible",
    summary: "Bonne base en place. Quelques ajustements stratégiques peuvent significativement améliorer votre visibilité et votre taux de conversion.",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
    nextAction: "Voir les optimisations recommandées",
  };
  if (score >= 40) return {
    icon: Zap,
    headline: "Base présente mais sous-optimisée",
    summary: "Votre entreprise existe en ligne, mais l'IA a du mal à la comprendre et à la recommander. Des corrections rapides peuvent changer la donne.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    nextAction: "Découvrir vos gains rapides",
  };
  return {
    icon: AlertTriangle,
    headline: "Présence fragile",
    summary: "Votre visibilité IA est très faible. L'IA ne peut pas vous recommander efficacement. Le potentiel de correction est important et les résultats peuvent être rapides.",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
    nextAction: "Voir ce qui bloque",
  };
}

export default function CardAIPPInterpretationInstant({ score, visible }: Props) {
  if (!visible) return null;
  const interp = getInterpretation(score);
  const Icon = interp.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border p-5 space-y-3 ${interp.bgColor}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${interp.color}`} />
        <span className={`text-sm font-bold ${interp.color}`}>{interp.headline}</span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{interp.summary}</p>
      <p className="text-xs font-medium text-muted-foreground">
        → {interp.nextAction}
      </p>
    </motion.div>
  );
}
