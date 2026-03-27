/**
 * AlexQuickReplyChips — Dynamic contextual quick-reply suggestions.
 * Chips evolve based on conversation step.
 */
import { motion } from "framer-motion";
import type { AlexStep } from "@/hooks/useAlexSession";

interface Chip {
  label: string;
  value: string;
}

interface AlexQuickReplyChipsProps {
  step: AlexStep;
  onSelect: (value: string) => void;
  className?: string;
}

function getChipsForStep(step: AlexStep): Chip[] {
  switch (step) {
    case "listening":
    case "idle":
      return [
        { label: "🏠 Toiture", value: "J'ai un projet de toiture." },
        { label: "🍳 Cuisine", value: "Je veux rénover ma cuisine." },
        { label: "🔧 Plomberie", value: "J'ai un problème de plomberie." },
        { label: "⚡ Électricité", value: "Je cherche un électricien." },
        { label: "🏗️ Rénovation complète", value: "Je planifie une rénovation complète." },
        { label: "🚚 Déménagement", value: "Je cherche une compagnie de déménagement." },
      ];
    case "thinking":
    case "predicting":
      return [];
    case "matching":
      return [
        { label: "📅 Voir les disponibilités", value: "Je veux voir les disponibilités." },
        { label: "ℹ️ En savoir plus", value: "Dis-moi en plus sur cet entrepreneur." },
      ];
    case "preparing_booking":
      return [
        { label: "📅 Cette semaine", value: "Je suis disponible cette semaine." },
        { label: "📅 Semaine prochaine", value: "Semaine prochaine serait mieux." },
        { label: "⏰ Urgent", value: "C'est urgent, le plus tôt possible." },
      ];
    case "no_result_recovery":
      return [
        { label: "🔍 Élargir la recherche", value: "Oui, élargis la recherche." },
        { label: "📞 Alex s'en occupe", value: "Je préfère que tu t'en occupes." },
      ];
    default:
      return [];
  }
}

export default function AlexQuickReplyChips({ step, onSelect, className = "" }: AlexQuickReplyChipsProps) {
  const chips = getChipsForStep(step);
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {chips.map((chip, i) => (
        <motion.button
          key={chip.value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          onClick={() => onSelect(chip.value)}
          className="text-xs font-medium px-3 py-2 rounded-full border border-border/60 bg-card/80 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
        >
          {chip.label}
        </motion.button>
      ))}
    </div>
  );
}
