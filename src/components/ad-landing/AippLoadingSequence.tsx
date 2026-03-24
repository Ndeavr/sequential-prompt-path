import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, Brain, Sparkles } from "lucide-react";

const STEPS = [
  { icon: Eye, text: "Analyse de votre identité d'entreprise", duration: 1200 },
  { icon: Shield, text: "Vérification de la clarté de vos services", duration: 1400 },
  { icon: Brain, text: "Détection des signaux de confiance", duration: 1300 },
  { icon: Sparkles, text: "Calcul de votre readiness IA", duration: 1100 },
];

interface Props {
  onComplete: () => void;
}

export default function AippLoadingSequence({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrentStep((s) => s + 1), STEPS[currentStep].duration);
    return () => clearTimeout(t);
  }, [currentStep, onComplete]);

  const progress = Math.min(((currentStep) / STEPS.length) * 100, 100);

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Progress ring */}
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={264}
            animate={{ strokeDashoffset: 264 - (264 * progress) / 100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-foreground">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <AnimatePresence key={i}>
              <motion.div
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isDone ? "bg-primary/10" : isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "opacity-40"
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isDone || isCurrent ? 1 : 0.4, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`rounded-lg p-2 ${isDone ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-sm font-medium ${isDone ? "text-primary" : "text-foreground"}`}>
                  {step.text}
                </span>
                {isCurrent && (
                  <motion.div
                    className="ml-auto h-2 w-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>
    </motion.div>
  );
}
