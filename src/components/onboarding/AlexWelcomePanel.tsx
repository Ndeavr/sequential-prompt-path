/**
 * UNPRO — Alex Welcome Panel (onboarding companion)
 * Shows contextual guidance from Alex during onboarding.
 */
import { motion } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";

interface AlexWelcomePanelProps {
  role?: string | null;
  step: number;
  firstName?: string | null;
}

const MESSAGES: Record<string, Record<number, string>> = {
  homeowner: {
    1: "Commençons par les essentiels — c'est rapide !",
    2: "Ajoutez votre propriété pour personnaliser vos recommandations.",
    3: "Aidez-moi à comprendre votre besoin actuel.",
    4: "Dernière étape ! Vos préférences me permettront de mieux vous orienter.",
  },
  contractor: {
    1: "Quelques infos pour créer votre compte pro.",
    2: "Parlez-moi de votre entreprise.",
    3: "Votre profil ADN aide à mieux vous jumeler avec les bons clients.",
  },
  default: {
    1: "Bienvenue ! Complétez vos informations.",
    2: "Presque terminé !",
  },
};

export default function AlexWelcomePanel({ role, step, firstName }: AlexWelcomePanelProps) {
  const roleKey = role === "homeowner" || role === "manager" ? "homeowner" : role === "contractor" ? "contractor" : "default";
  const messages = MESSAGES[roleKey] || MESSAGES.default;
  const message = messages[step] || "Je suis là si vous avez besoin d'aide.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-card/80 backdrop-blur-lg border border-border shadow-[var(--shadow-md)]"
    >
      <UnproIcon size={32} variant="blue" className="shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {firstName && step === 1 ? `${firstName}, ${message.charAt(0).toLowerCase()}${message.slice(1)}` : message}
      </p>
    </motion.div>
  );
}
