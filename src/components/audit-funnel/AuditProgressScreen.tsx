import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Globe, Search, Shield, BarChart3, FileText } from "lucide-react";

interface Props { businessName?: string; }

const STEPS = [
  { label: "Identification de l'entreprise", icon: Search, delay: 0 },
  { label: "Analyse du site web", icon: Globe, delay: 3000 },
  { label: "Vérification de la présence Google", icon: Search, delay: 6000 },
  { label: "Validation des signaux de confiance", icon: Shield, delay: 9000 },
  { label: "Calcul du score", icon: BarChart3, delay: 12000 },
  { label: "Préparation du plan recommandé", icon: FileText, delay: 15000 },
];

export function AuditProgressScreen({ businessName }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const timers = STEPS.map((step, i) =>
      setTimeout(() => {
        setActiveStep(i);
        setProgress(Math.min(10 + (i + 1) * 15, 90));
      }, step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-16 text-center">
      <h2 className="font-display text-2xl font-bold mb-2">Analyse en cours…</h2>
      {businessName && <p className="text-primary font-medium mb-6">{businessName}</p>}
      <p className="text-sm text-muted-foreground mb-8">
        Nous validons vos signaux publics pour produire un score réel, jamais inventé.
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-border/20 mb-10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Steps checklist */}
      <div className="space-y-3 text-left">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= activeStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                active ? "bg-primary/10 border border-primary/20" : done ? "bg-card/20" : ""
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
              ) : (
                <StepIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className={done ? "text-green-300" : active ? "text-primary" : "text-muted-foreground"}>
                {step.label}
              </span>
              {done && <span className="ml-auto text-xs text-green-400">✓</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
