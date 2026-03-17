/**
 * UNPRO — Alex Flow Engine
 * Contextual question flow based on deep link feature.
 * Max 3 questions → action.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AlexFeature = "kitchen" | "home_score" | "booking" | "design" | "energy" | "maintenance";

interface FlowStep {
  question: string;
  options: string[];
  key: string;
}

const FEATURE_FLOWS: Record<AlexFeature, { greeting: string; steps: FlowStep[] }> = {
  kitchen: {
    greeting: "Tu veux transformer ta cuisine? Je peux t'aider en quelques secondes.",
    steps: [
      { question: "Quel style tu préfères?", options: ["Moderne", "Classique", "Scandinave", "Industriel"], key: "style" },
      { question: "Budget approximatif?", options: ["< 15 000$", "15-30k$", "30-50k$", "50k$+"], key: "budget" },
      { question: "Tu as une photo de ta cuisine?", options: ["Oui, j'en ai une", "Pas maintenant"], key: "has_photo" },
    ],
  },
  home_score: {
    greeting: "Je vais analyser ta maison et te donner un score personnalisé.",
    steps: [
      { question: "C'est dans quelle ville?", options: ["Montréal", "Laval", "Québec", "Autre"], key: "city" },
      { question: "Type de propriété?", options: ["Maison", "Condo", "Duplex", "Autre"], key: "property_type" },
      { question: "Année de construction?", options: ["Avant 1970", "1970-1999", "2000-2015", "Après 2015"], key: "year" },
    ],
  },
  booking: {
    greeting: "Je vais t'aider à prendre rendez-vous avec le bon professionnel.",
    steps: [
      { question: "C'est pour quel type de travaux?", options: ["Plomberie", "Électricité", "Rénovation", "Autre"], key: "service" },
      { question: "C'est urgent ou planifié?", options: ["Urgent", "Cette semaine", "Ce mois", "Pas pressé"], key: "urgency" },
      { question: "Ville?", options: ["Montréal", "Laval", "Québec", "Autre"], key: "city" },
    ],
  },
  design: {
    greeting: "On va créer un design personnalisé pour ton espace.",
    steps: [
      { question: "Quelle pièce?", options: ["Cuisine", "Salon", "Salle de bain", "Chambre"], key: "room" },
      { question: "Quel style?", options: ["Moderne", "Bohème", "Minimaliste", "Rustique"], key: "style" },
    ],
  },
  energy: {
    greeting: "Je vais analyser l'efficacité énergétique de ta maison.",
    steps: [
      { question: "Type de chauffage?", options: ["Gaz", "Électrique", "Thermopompe", "Autre"], key: "heating" },
      { question: "Superficie approx?", options: ["< 1000 pi²", "1000-2000 pi²", "2000-3000 pi²", "> 3000 pi²"], key: "area" },
    ],
  },
  maintenance: {
    greeting: "On va planifier l'entretien préventif de ta maison.",
    steps: [
      { question: "Type de propriété?", options: ["Maison", "Condo", "Immeuble"], key: "type" },
      { question: "Dernier entretien majeur?", options: ["< 1 an", "1-3 ans", "3-5 ans", "5 ans+"], key: "last_maintenance" },
    ],
  },
};

interface AlexFlowEngineProps {
  feature: AlexFeature;
  onComplete: (context: Record<string, string>) => void;
  onDismiss: () => void;
}

export default function AlexFlowEngine({ feature, onComplete, onDismiss }: AlexFlowEngineProps) {
  const flow = FEATURE_FLOWS[feature] || FEATURE_FLOWS.design;
  const [step, setStep] = useState(-1); // -1 = greeting
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = useCallback((option: string) => {
    if (step === -1) {
      setStep(0);
      return;
    }
    const currentStep = flow.steps[step];
    const newAnswers = { ...answers, [currentStep.key]: option };
    setAnswers(newAnswers);

    if (step >= flow.steps.length - 1) {
      onComplete(newAnswers);
    } else {
      setStep(s => s + 1);
    }
  }, [step, answers, flow, onComplete]);

  const currentQuestion = step === -1 ? flow.greeting : flow.steps[step]?.question;
  const currentOptions = step === -1 ? ["Commencer", "Voir un exemple"] : flow.steps[step]?.options || [];
  const progress = step === -1 ? 0 : ((step + 1) / flow.steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)]"
    >
      <div className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[var(--shadow-2xl)] overflow-hidden">
        {/* Top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Progress bar */}
        <div className="h-0.5 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            {step > -1 && (
              <button onClick={() => setStep(s => s - 1)} className="h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center">
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-primary">Alex</p>
              {step >= 0 && (
                <p className="text-[10px] text-muted-foreground">{step + 1}/{flow.steps.length}</p>
              )}
            </div>
            <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ✕
            </button>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-sm text-foreground leading-relaxed"
            >
              {currentQuestion}
            </motion.p>
          </AnimatePresence>

          {/* Options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-wrap gap-2"
            >
              {currentOptions.map((opt, i) => (
                <motion.button
                  key={opt}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleAnswer(opt)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                >
                  {opt}
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
